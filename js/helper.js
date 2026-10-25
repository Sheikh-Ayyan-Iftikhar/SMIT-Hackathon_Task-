/* ============================================================
   helper.js — the "smart helper" chat box.
   Answers are keyword-matched against real data in localStorage:
   Admin sees all data, an employee sees only their own.
   ============================================================ */

const Helper = {

  /* ---------- Admin answers (all data) ---------- */
  adminAnswer(q) {
    const text = q.toLowerCase();
    const company = getCompany();
    const all = employees();

    if (all.length === 0 && /employee|headcount|staff|team/.test(text)) {
      return { text: 'There are no employee records yet, so there is nothing to count. Add employees from the Employees page first.', src: 'hcm_users' };
    }

    if (/joined|started (this|last) month|new employees/.test(text)) {
      const now = new Date();
      const startISO = todayISO(new Date(now.getFullYear(), now.getMonth(), 1));
      const joined = all.filter(u => String(u.createdAt).slice(0, 10) >= startISO);
      if (!joined.length) return { text: 'No employees joined in the current month yet.', src: 'hcm_users' };
      return { text: '<b>' + joined.length + '</b> employee' + (joined.length === 1 ? '' : 's') + ' joined this month: ' + UI.esc(joined.map(u => u.name).join(', ')) + '.', src: 'hcm_users' };
    }

    if (/how many employee|total employee|employee count|headcount|staff count/.test(text)) {
      return { text: 'There are <b>' + all.length + '</b> employee' + (all.length === 1 ? '' : 's') + ' in the company.', src: 'hcm_users' };
    }

    if (/on leave today|who is on leave|leave today/.test(text)) {
      const list = Leave.onLeaveToday();
      if (!list.length) return { text: 'No one is on approved leave today.', src: 'hcm_leaves' };
      const names = list.map(l => { const u = findUser(l.userId); return u ? u.name : 'Unknown'; });
      const byType = {};
      list.forEach(l => { byType[l.type.toLowerCase()] = (byType[l.type.toLowerCase()] || 0) + 1; });
      const split = Object.keys(byType).map(k => byType[k] + ' ' + k).join(', ');
      return { text: '<b>' + list.length + '</b> employee' + (list.length === 1 ? ' is' : 's are') + ' on leave today: ' + UI.esc(names.join(', ')) + '. (' + UI.esc(split) + ')', src: 'hcm_leaves' };
    }

    if (/late today|who was late/.test(text)) {
      const late = attendanceOn(todayISO()).filter(a => a.late);
      if (!late.length) return { text: 'No one has a late check-in recorded today.', src: 'hcm_attendance' };
      const names = late.map(a => { const u = findUser(a.userId); return (u ? u.name : 'Unknown') + ' (' + a.checkIn + ')'; });
      return { text: '<b>' + late.length + '</b> late check-in' + (late.length === 1 ? '' : 's') + ' today: ' + UI.esc(names.join(', ')) + '.', src: 'hcm_attendance' };
    }

    if (/absent today|who is absent/.test(text)) {
      const absent = Attendance.absentOn(todayISO());
      if (!absent.length) return { text: 'No one is marked absent today — everyone has an attendance record.', src: 'hcm_attendance' };
      return { text: '<b>' + absent.length + '</b> employee' + (absent.length === 1 ? ' has' : 's have') + ' no attendance record today and count' + (absent.length === 1 ? 's' : '') + ' as absent: ' + UI.esc(absent.map(u => u.name).join(', ')) + '.', src: 'hcm_attendance' };
    }

    if (/present today|attendance today|today.?s attendance/.test(text)) {
      const s = Attendance.summaryOn(todayISO());
      if (!s.records) return { text: 'No attendance records exist for today yet.', src: 'hcm_attendance' };
      return { text: 'Today — present: <b>' + s.present + '</b>, late: <b>' + s.late + '</b>, half day: <b>' + s.halfDay + '</b>, absent: <b>' + s.absent + '</b>.', src: 'hcm_attendance' };
    }

    if (/department|dept/.test(text)) {
      const list = Employees.departments();
      if (!list.length) return { text: 'No departments exist yet — employees have not been assigned one.', src: 'hcm_users' };
      const rows = list.map(d => ({ name: d, count: all.filter(u => u.department === d).length })).sort((a, b) => b.count - a.count);
      return {
        text: '<b>' + UI.esc(rows[0].name) + '</b> is the largest with <b>' + rows[0].count + '</b>. Breakdown: ' + UI.esc(rows.map(r => r.name + ' (' + r.count + ')').join(', ')) + '.',
        src: 'hcm_users'
      };
    }

    if (/pending leave|leaves? pending|awaiting/.test(text)) {
      const n = Leave.pending().length;
      return { text: 'There ' + (n === 1 ? 'is' : 'are') + ' <b>' + n + '</b> pending leave request' + (n === 1 ? '' : 's') + '.', src: 'hcm_leaves' };
    }

    if (/leave/.test(text)) {
      const all2 = getLeaves();
      if (!all2.length) return { text: 'No leave requests have been submitted yet.', src: 'hcm_leaves' };
      const c = { pending: 0, approved: 0, rejected: 0 };
      all2.forEach(l => { if (c[l.status] !== undefined) c[l.status]++; });
      return { text: 'Leave requests — pending: <b>' + c.pending + '</b>, approved: <b>' + c.approved + '</b>, rejected: <b>' + c.rejected + '</b>.', src: 'hcm_leaves' };
    }

    if (/salary|payslip/.test(text)) {
      const total = all.reduce((s, u) => s + Number(u.salary || 0), 0);
      return { text: 'Total monthly salary across ' + all.length + ' employee' + (all.length === 1 ? '' : 's') + ' is <b>' + UI.fmtMoney(total) + '</b>. Open Payslip for an individual slip.', src: 'hcm_users' };
    }

    if (company) {
      return {
        text: 'I can answer questions about employees, attendance, leave and salaries — for example: <i>"How many employees do we have?"</i>, <i>"Who is on leave today?"</i> or <i>"Who was late today?"</i>',
        src: ''
      };
    }
    return { text: 'The company has not been set up yet.', src: '' };
  },

  /* ---------- Employee answers (own data only) ---------- */
  employeeAnswer(q, userId) {
    const text = q.toLowerCase();
    const me = findUser(userId);
    const company = getCompany();

    if (/leaves? (do i have )?(left|remaining)|leave balance|balance|quota|how many leaves do i/.test(text)) {
      const b = Leave.balance(userId);
      return { text: 'You have <b>' + b.left + '</b> of <b>' + b.quota + '</b> leave days left for ' + b.year + ' (' + b.used + ' used).', src: 'hcm_leaves' };
    }

    if (/was i late|late today|am i late/.test(text)) {
      const rec = attendanceFor(userId, todayISO());
      if (!rec) return { text: 'You have no attendance record for today, so there is no check-in time to compare against ' + company.startTime + ' + ' + company.graceMinutes + ' minutes.', src: 'hcm_attendance' };
      if (rec.late) return { text: 'Yes — you checked in at <b>' + rec.checkIn + '</b>, after ' + company.startTime + ' + ' + company.graceMinutes + ' minutes grace.', src: 'hcm_attendance' };
      return { text: 'No — you checked in at <b>' + rec.checkIn + '</b>, which is on time.', src: 'hcm_attendance' };
    }

    if (/hour|worked|work this week|this week/.test(text)) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      const from = todayISO(weekStart);
      const rows = attendanceOf(userId).filter(a => a.date >= from && a.checkOut);
      let mins = 0;
      rows.forEach(a => { mins += timeToMinutes(a.checkOut) - timeToMinutes(a.checkIn); });
      const hours = (mins / 60).toFixed(1);
      return { text: 'You logged <b>' + hours + ' hours</b> over the last 7 days (' + rows.length + ' completed day' + (rows.length === 1 ? '' : 's') + ').', src: 'hcm_attendance' };
    }

    if (/my attendance|attendance summary|how (have|was) i doing/.test(text)) {
      const rows = attendanceOf(userId);
      if (!rows.length) return { text: 'You have no attendance records yet. Check in to create your first one.', src: 'hcm_attendance' };
      const c = { present: 0, late: 0, 'half-day': 0 };
      rows.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
      return { text: 'Your records so far — present: <b>' + c.present + '</b>, late: <b>' + c.late + '</b>, half day: <b>' + c['half-day'] + '</b> (' + rows.length + ' days in total).', src: 'hcm_attendance' };
    }

    if (/my leave|leave status|leave request|leave history/.test(text)) {
      const rows = leavesOf(userId);
      if (!rows.length) return { text: 'You have not applied for any leave yet.', src: 'hcm_leaves' };
      const c = { pending: 0, approved: 0, rejected: 0 };
      rows.forEach(l => { if (c[l.status] !== undefined) c[l.status]++; });
      return { text: 'Your leave requests — pending: <b>' + c.pending + '</b>, approved: <b>' + c.approved + '</b>, rejected: <b>' + c.rejected + '</b>.', src: 'hcm_leaves' };
    }

    if (/how many employee|employees do we have|headcount|department|who is on leave|who was late|pending leave|absent today|salary|company/.test(text)) {
      return { text: 'I can only show your own records — attendance, leave and balance. Company-wide figures are restricted to the Admin.', src: 'permission' };
    }

    if (/today|check in|checkout|check out/.test(text)) {
      const rec = attendanceFor(userId, todayISO());
      if (!rec) return { text: 'You have no attendance record for today yet.', src: 'hcm_attendance' };
      return { text: 'Today you checked in at <b>' + rec.checkIn + '</b>' + (rec.checkOut ? ' and checked out at <b>' + rec.checkOut + '</b>' : ' and have not checked out yet') + '. Status: <b>' + rec.status + '</b>.', src: 'hcm_attendance' };
    }

    return { text: 'Ask me about <i>"Was I late today?"</i>, <i>"How many hours did I work this week?"</i>, <i>"My attendance"</i> or <i>"How many leaves do I have left?"</i>', src: '' };
  },

  /* ---------- Entry point ---------- */
  answer(question, user) {
    try {
      if (!hasCompany()) return { text: 'The company has not been set up yet, so there is no data to read.', src: '' };
      const q = String(question || '').trim();
      if (!q) return { text: 'Type a question to get started.', src: '' };
      return user.role === 'admin' ? Helper.adminAnswer(q) : Helper.employeeAnswer(q, user.id);
    } catch (e) {
      console.error('helper failed', e);
      return { text: 'The information could not be retrieved, so no answer was generated. Please try again.', src: 'error' };
    }
  },

  /* AI is on when an API key is stored in this browser. Without one
     (or whenever the request fails) the local answer above is used,
     so the helper always replies with real data. */
  mode() {
    return (typeof AI !== 'undefined' && AI.enabled()) ? 'ai' : 'local';
  },

  answerAsync(question, user) {
    const local = Helper.answer(question, user);
    if (Helper.mode() === 'local') return Promise.resolve(Object.assign({}, local, { via: 'local' }));
    if (!String(question || '').trim()) return Promise.resolve(Object.assign({}, local, { via: 'local' }));

    const why = {
      'bad-key': 'the API key was rejected',
      http: 'the AI provider returned an error',
      timeout: 'the request timed out',
      network: 'there is no network connection',
      empty: 'the model returned an empty reply',
      junk: 'the model returned a safety stub instead of an answer',
      off: 'no API key is saved'
    };
    return AI.ask(question, user).then(r => {
      if (r && r.ok) return { text: r.text, src: r.src, via: 'ai' };
      return Object.assign({}, local, {
        via: 'local',
        note: why[(r || {}).code] || 'the assistant is unavailable'
      });
    }).catch(() => Object.assign({}, local, { via: 'local', note: 'the request failed' }));
  },

  /* ---------- Renders the chat box into an element ---------- */
  mount(el, user) {
    const chips = user.role === 'admin'
      ? ['How many employees do we have?', 'Who is on leave today?', 'Who was late today?', 'How many leaves are pending?']
      : ['How many leaves do I have left?', 'Was I late today?', 'How many hours did I work this week?', 'My attendance'];

    const onAi = Helper.mode() === 'ai';
    el.innerHTML =
      '<div class="card">' +
      '  <div class="card-hd"><span>Smart helper</span><span class="flex gap-sm">' +
      '    <span class="badge ' + (onAi ? 'badge-ok' : 'badge-mute') + '">' + (onAi ? 'AI on' : 'local data') + '</span>' +
      '    <span class="badge badge-mute">' + (user.role === 'admin' ? 'all data' : 'own data') + '</span></span></div>' +
      '  <div class="chat">' +
      '    <div class="chat-log" id="helperLog" role="log" aria-live="polite"></div>' +
      '    <div class="chips">' + chips.map(c => '<button type="button" class="chip" data-q="' + UI.esc(c) + '">' + UI.esc(c) + '</button>').join('') + '</div>' +
      '    <form class="chat-form" id="helperForm">' +
      '      <label class="lbl" for="helperInput" style="position:absolute;left:-9999px">Ask the smart helper</label>' +
      '      <input class="input" id="helperInput" autocomplete="off" placeholder="Ask a question…">' +
      '      <button class="btn btn-primary" type="submit">Ask</button>' +
      '    </form>' +
      '  </div>' +
      '</div>';

    const log = document.getElementById('helperLog');
    const input = document.getElementById('helperInput');

    function push(cls, html, src) {
      const m = document.createElement('div');
      m.className = 'msg ' + cls;
      m.innerHTML = '<div class="bub">' + html + '</div>' + (src ? '<div class="src">source: ' + UI.esc(src) + '</div>' : '');
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    }

    function typing() {
      const m = document.createElement('div');
      m.className = 'msg bot typing';
      m.innerHTML = '<div class="bub muted">Thinking…</div>';
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
      return m;
    }

    push('bot', 'Hi ' + UI.esc(user.name.split(' ')[0]) + '. Ask me anything about ' +
      (user.role === 'admin' ? 'your company records' : 'your attendance and leave') + '.',
      onAi ? 'openrouter · ' + (typeof AI !== 'undefined' ? AI.model() : '') : 'localStorage');

    document.getElementById('helperForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      push('me', UI.esc(q));
      input.value = '';
      const wait = typing();
      Helper.answerAsync(q, user).then(function (res) {
        if (wait.parentNode) wait.parentNode.removeChild(wait);
        push('bot', res.text, res.src);
        if (res.via === 'local' && res.note) {
          push('bot', '<span class="muted">Switched to local answers — ' + UI.esc(res.note) + '.</span>', 'fallback');
        }
      }, function () {
        if (wait.parentNode) wait.parentNode.removeChild(wait);
        push('bot', 'The information could not be retrieved, so no answer was generated.', 'error');
      });
    });

    el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', function () {
      input.value = this.getAttribute('data-q');
      document.getElementById('helperForm').dispatchEvent(new Event('submit', { cancelable: true }));
    }));
  }
};
