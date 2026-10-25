/* ============================================================
   ai.js — optional live assistant behind the smart helper.

   The API key is NEVER stored in the source tree or in git: the
   repository and the GitHub Pages site are public, so a committed
   key would be readable by anyone. Instead the key lives in this
   browser only, under hcm_ai_key, and can be supplied by opening
   the sign-in page once with   index.html#ai=<your key>
   or by pasting it into Settings.

   Provider: OpenRouter (https://openrouter.ai) chat completions.
   Every request carries the role-scoped facts below, so the model
   can only repeat numbers that actually exist in localStorage.
   ============================================================ */

const AI = {
  LS_KEY: 'hcm_ai_key',
  LS_MODEL: 'hcm_ai_model',
  DEFAULT_MODEL: 'openrouter/free',
  ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',
  TIMEOUT_MS: 25000,

  /* ---------- key / model stored in this browser only ---------- */
  key() {
    try { return String(localStorage.getItem(AI.LS_KEY) || '').trim(); } catch (e) { return ''; }
  },
  setKey(v) {
    try {
      const k = String(v || '').trim();
      if (!k) { localStorage.removeItem(AI.LS_KEY); return false; }
      localStorage.setItem(AI.LS_KEY, k);
      return true;
    } catch (e) { return false; }
  },
  clearKey() { try { localStorage.removeItem(AI.LS_KEY); } catch (e) {} },

  model() {
    try { return String(localStorage.getItem(AI.LS_MODEL) || '').trim() || AI.DEFAULT_MODEL; }
    catch (e) { return AI.DEFAULT_MODEL; }
  },
  setModel(v) {
    try {
      const m = String(v || '').trim();
      if (m) localStorage.setItem(AI.LS_MODEL, m); else localStorage.removeItem(AI.LS_MODEL);
    } catch (e) {}
  },

  enabled() { return AI.key().length >= 20; },

  /* Accept the key handed over as  #ai=<key>  on any page, then
     scrub it from the address bar so it is not left in history. */
  captureHash() {
    try {
      const m = (location.hash || '').match(/^#ai=(.+)$/);
      if (!m) return false;
      const raw = decodeURIComponent(m[1]).trim();
      const ok = AI.setKey(raw);
      history.replaceState(null, '', location.pathname + location.search);
      return ok;
    } catch (e) { return false; }
  },

  /* ---------- what the model is allowed to know ---------- */
  facts(user) {
    const company = getCompany() || {};
    const today = todayISO();
    const base = {
      app: 'LetMeHire',
      today: today,
      company: {
        name: company.name,
        officeStart: company.startTime,
        graceMinutes: company.graceMinutes,
        leaveQuotaPerYear: company.leaveQuota,
        workingDays: company.workingDays,
        currency: company.currency
      }
    };

    if (!user || user.role === 'employee') {
      const uid = user ? Number(user.id) : 0;
      const bal = user ? Leave.balance(uid) : { left: 0, quota: 0, used: 0, year: today.slice(0, 4) };
      const mine = attendanceOf(uid).slice(0, 14);
      const myLeaves = leavesOf(uid).slice(0, 10);
      const rec = attendanceFor(uid, today);
      return Object.assign(base, {
        scope: 'EMPLOYEE — you may only disclose the employee\'s own records below.',
        viewer: { name: user ? user.name : '', department: user ? user.department : '' },
        leaveBalance: bal,
        todayAttendance: rec ? { checkIn: rec.checkIn, checkOut: rec.checkOut || null, status: rec.status, late: !!rec.late } : null,
        todayNote: rec ? '' : 'No attendance record exists for today yet — the employee has not checked in.',
        myAttendance: mine.map(a => ({ date: a.date, in: a.checkIn, out: a.checkOut || null, status: a.status, late: !!a.late })),
        myLeaves: myLeaves.map(l => ({ type: l.type, from: l.from, to: l.to, days: l.days, status: l.status })),
        companyTotals: 'withheld — not sent for employees'
      });
    }

    const all = employees();
    const sum = Attendance.summaryOn(today);
    const pending = Leave.pending();
    const leaveAll = getLeaves();
    const leaveTotals = { pending: 0, approved: 0, rejected: 0 };
    leaveAll.forEach(l => { if (leaveTotals[l.status] !== undefined) leaveTotals[l.status]++; });
    const monthStart = todayISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const joinedThisMonth = all.filter(u => String(u.createdAt || '').slice(0, 10) >= monthStart).map(u => u.name);

    return Object.assign(base, {
      scope: 'ADMIN — full company data is allowed.',
      headcount: all.length,
      departments: Employees.departments(),
      joinedThisMonth: joinedThisMonth,
      myLeaveBalance: user ? Leave.balance(Number(user.id)) : null,
      employees: all.slice(0, 60).map(u => ({
        name: u.name, department: u.department || null, salary: Number(u.salary || 0),
        joinedOn: String(u.createdAt || '').slice(0, 10)
      })),
      todayAttendance: {
        present: sum.present, late: sum.late, halfDay: sum.halfDay,
        absent: sum.absent, records: sum.records
      },
      lateToday: attendanceOn(today).filter(a => a.late)
        .map(a => ({ name: (findUser(a.userId) || {}).name || 'Unknown', checkIn: a.checkIn })),
      onLeaveToday: Leave.onLeaveToday().map(l => ({
        name: (findUser(l.userId) || {}).name || 'Unknown', type: l.type
      })),
      absentToday: Attendance.absentOn(today).map(u => u.name),
      pendingLeaves: pending.length,
      leaveTotals: leaveTotals,
      recentAttendance: attendanceOn(today).slice(0, 60).map(a => ({
        name: (findUser(a.userId) || {}).name || 'Unknown',
        checkIn: a.checkIn, checkOut: a.checkOut || null, status: a.status
      }))
    });
  },

  /* Escape everything the model returns, then allow back only a
     tiny inline subset the chat bubbles already support. */
  escHtml(text) {
    const escaped = String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/&lt;(\/?)(b|i|em|strong|br)\s*&gt;/gi, '<$1$2>')
      .replace(/&lt;(br)\s*\/&gt;/gi, '<br>');
  },

  /* Free models sometimes answer with a moderation string instead of
     an answer ("User Safety: safe"). That is useless to the user, so
     it is treated exactly like an empty reply: retry, then give up. */
  isJunk(text) {
    const s = String(text == null ? '' : text).trim();
    if (!s) return true;
    if (/^user\s*safety\b/i.test(s)) return true;
    if (/\bsafety categories\b/i.test(s)) return true;
    if (/^(safe|unsafe|flagged|blocked|refused)[.!]?$/i.test(s)) return true;
    return false;
  },

  /* ---------- the request ----------
     A free model occasionally answers with nothing or with a safety
     stub; one silent retry before the helper falls back locally. */
  ask(question, user) {
    if (!AI.enabled()) return Promise.resolve({ ok: false, code: 'off' });
    return AI._request(question, user, true);
  },

  _request(question, user, retry) {
    const key = AI.key();
    const facts = AI.facts(user);
    const system =
      'You are the built-in assistant of LetMeHire, a small HR web app. ' +
      'Answer ONLY from the JSON data below. Never invent names, numbers, dates or statuses. ' +
      'If the data does not contain the answer, say plainly that you do not have it. ' +
      'An empty array means there is simply nothing to report - answer with that, do not call it missing data. ' +
      'If the viewer scope is EMPLOYEE, refuse company-wide questions and say the Admin can see those. ' +
      'Reply in the same language as the question, in 1-3 short sentences. ' +
      'You may use <b>bold</b> and <i>italic</i> tags only - no markdown, no lists, no links.\n\n' +
      'DATA:\n' + JSON.stringify(facts);

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), AI.TIMEOUT_MS) : null;
    let origin = 'https://localhost';
    try {
      if (typeof location !== 'undefined' && location.origin) origin = location.origin;
      else if (typeof location !== 'undefined' && location.protocol && location.host) origin = location.protocol + '//' + location.host;
    } catch (e) {}

    return fetch(AI.ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-Title': 'LetMeHire'
      },
      body: JSON.stringify({
        model: AI.model(),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: String(question || '').trim() }
        ],
        max_tokens: 500,
        temperature: 0.2
      }),
      signal: controller ? controller.signal : undefined
    }).then(res => {
      if (timer) clearTimeout(timer);
      if (!res.ok) {
        return res.text().then(t => {
          let detail = t;
          try { detail = (JSON.parse(t).error || {}).message || t; } catch (e) {}
          console.warn('assistant HTTP ' + res.status, String(detail).slice(0, 200));
          return { ok: false, code: res.status === 401 ? 'bad-key' : 'http', status: res.status };
        });
      }
      return res.json().then(data => {
        const choice = data && data.choices && data.choices[0];
        const text = choice && choice.message && choice.message.content;
        if (AI.isJunk(text)) {
          if (retry) return AI._request(question, user, false);
          return { ok: false, code: String(text || '').trim() ? 'junk' : 'empty' };
        }
        return {
          ok: true,
          text: AI.escHtml(String(text).trim()),
          src: 'openrouter · ' + (data.model || AI.model())
        };
      });
    }).catch(err => {
      if (timer) clearTimeout(timer);
      const aborted = err && (err.name === 'AbortError' || /abort/i.test(String(err.message)));
      console.warn('assistant request failed', err && err.message);
      return { ok: false, code: aborted ? 'timeout' : 'network' };
    });
  }
};
