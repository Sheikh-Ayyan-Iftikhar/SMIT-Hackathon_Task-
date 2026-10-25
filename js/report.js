/* ============================================================
   report.js — printable monthly attendance report (Admin)
   Same rules as the dashboard: late / half-day / absent come
   from Attendance.computeStatus, leave comes from the register.
   ============================================================ */

const Report = {

  monthLabel(monthValue) {
    const p = String(monthValue || '').split('-').map(Number);
    if (p.length !== 2 || !p[0] || !p[1]) return monthValue;
    return new Date(p[0], p[1] - 1, 1)
      .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  },

  /* Last 6 months as <select> options, current month first. */
  monthOptions() {
    const out = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const v = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      out.push('<option value="' + v + '"' + (i === 0 ? ' selected' : '') + '>' +
        UI.esc(d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })) + '</option>');
    }
    return out.join('');
  },

  /* Aggregates for one month. */
  data(monthValue) {
    const company = getCompany() || {};
    const parts = String(monthValue).split('-').map(Number);
    const days = new Date(parts[0], parts[1], 0).getDate();
    const approved = getLeaves().filter(l => l.status === 'approved');
    const per = employees().map(u => {
      const row = { user: u, present: 0, late: 0, half: 0, absent: 0, leave: 0, hours: 0, working: 0 };
      const from = monthValue + '-01';

      for (let d = 1; d <= days; d++) {
        const iso = monthValue + '-' + (d < 10 ? '0' : '') + d;
        if (!isWorkingDay(iso, company)) continue;
        row.working++;
        const rec = attendanceFor(u.id, iso);
        if (rec) {
          const st = Attendance.computeStatus(rec, company);
          if (st === 'half-day') row.half++;
          else if (st === 'late') { row.late++; row.present++; }
          else row.present++;
          if (rec.checkIn && rec.checkOut) {
            const a = timeToMinutes(rec.checkIn), b = timeToMinutes(rec.checkOut);
            if (a != null && b != null && b > a) row.hours += (b - a) / 60;
          }
        } else if (approved.some(l => l.userId === u.id && l.from <= iso && l.to >= iso)) {
          row.leave++;
        } else {
          row.absent++;
        }
      }
      return row;
    });

    const totals = per.reduce((t, r) => {
      t.working += r.working; t.present += r.present; t.late += r.late;
      t.half += r.half; t.absent += r.absent; t.leave += r.leave; t.hours += r.hours;
      return t;
    }, { working: 0, present: 0, late: 0, half: 0, absent: 0, leave: 0, hours: 0 });

    /* department rollup */
    const depts = {};
    per.forEach(r => {
      const k = r.user.department || 'No department';
      if (!depts[k]) depts[k] = { name: k, people: 0, present: 0, late: 0, absent: 0, hours: 0 };
      const d = depts[k];
      d.people++; d.present += r.present; d.late += r.late; d.absent += r.absent; d.hours += r.hours;
    });

    return { month: monthValue, label: Report.monthLabel(monthValue), rows: per, totals: totals, depts: Object.keys(depts).map(k => depts[k]) };
  },

  build(monthValue) {
    const data = Report.data(monthValue);
    const company = getCompany() || {};
    const user = currentUser() || {};
    const t = data.totals;
    const money = Number((company.leaveQuota || 0));

    const chip = (color, ico, val, lbl) =>
      '<div class="stat c-' + color + '"><span class="ico">' + ico + '</span>' +
      '<span><span class="val">' + val + '</span><span class="lbl">' + UI.esc(lbl) + '</span></span></div>';

    const head =
      '<div class="rep-hd">' +
      '  <div><div class="eyebrow">LetMeHire · attendance report</div>' +
      '  <h3 class="mb-0">' + UI.esc(company.name || 'Company') + '</h3>' +
      '  <div class="small muted">' + UI.esc(data.label) + ' · generated ' + UI.esc(UI.fmtDate(todayISO())) + '</div></div>' +
      '  <div class="right small muted">Prepared by ' + UI.esc(user.name || '') + '</div>' +
      '</div>';

    const stats =
      '<div class="stats mb-3">' +
        chip('brand', '&#9823;', data.rows.length, 'Employees') +
        chip('ok', '&#10003;', t.present, 'Present days') +
        chip('warn', '&#9200;', t.late, 'Late arrivals') +
        chip('info', '&#9999;', t.half, 'Half days') +
        chip('bad', '&#10007;', t.absent, 'Absent days') +
        chip('muted', '&#9825;', t.leave, 'Leave days') +
      '</div>';

    const empRows = data.rows.map(r => {
      const u = r.user;
      return '<tr>' +
        '<td class="nowrap"><span class="bold">' + UI.esc(u.name) + '</span><br>' +
        '<span class="smaller muted">' + UI.esc(u.department || 'No department') + '</span></td>' +
        '<td class="right">' + r.working + '</td>' +
        '<td class="right">' + r.present + '</td>' +
        '<td class="right">' + r.late + '</td>' +
        '<td class="right">' + r.half + '</td>' +
        '<td class="right">' + r.leave + '</td>' +
        '<td class="right">' + r.absent + '</td>' +
        '<td class="right">' + r.hours.toFixed(1) + '</td>' +
        '</tr>';
    }).join('');

    const deptRows = data.depts.map(d =>
      '<tr><td>' + UI.esc(d.name) + '</td><td class="right">' + d.people + '</td>' +
      '<td class="right">' + d.present + '</td><td class="right">' + d.late + '</td>' +
      '<td class="right">' + d.absent + '</td><td class="right">' + d.hours.toFixed(1) + '</td></tr>'
    ).join('');

    return head + stats +
      '<div class="tbl-wrap mb-3"><table class="tbl">' +
      '<thead><tr><th>Employee</th><th class="right">Working days</th><th class="right">Present</th>' +
      '<th class="right">Late</th><th class="right">Half day</th><th class="right">Leave</th>' +
      '<th class="right">Absent</th><th class="right">Hours</th></tr></thead>' +
      '<tbody>' + (empRows || '<tr><td colspan="8" class="muted">No employees yet.</td></tr>') + '</tbody>' +
      '<tfoot><tr class="rep-total"><td class="bold">Company total</td>' +
      '<td class="right">' + t.working + '</td><td class="right">' + t.present + '</td>' +
      '<td class="right">' + t.late + '</td><td class="right">' + t.half + '</td>' +
      '<td class="right">' + t.leave + '</td><td class="right">' + t.absent + '</td>' +
      '<td class="right">' + t.hours.toFixed(1) + '</td></tr></tfoot>' +
      '</table></div>' +

      '<div class="tbl-wrap mb-2"><table class="tbl">' +
      '<thead><tr><th>Department</th><th class="right">Headcount</th><th class="right">Present days</th>' +
      '<th class="right">Late</th><th class="right">Absent</th><th class="right">Hours</th></tr></thead>' +
      '<tbody>' + (deptRows || '<tr><td colspan="6" class="muted">No departments yet.</td></tr>') + '</tbody></table></div>' +

      '<p class="small muted mb-0">Late = check-in after office start + ' + Number(company.graceMinutes || 0) +
      ' minutes. Half day = under 5 worked hours. Absent = working day with no record. ' +
      'Leave counts working days only. Yearly quota: ' + money + ' days per employee.</p>';
  },

  /* Fill the print-only container and open the print dialog. */
  print(monthValue) {
    let box = document.getElementById('printReport');
    if (!box) {
      box = document.createElement('div');
      box.id = 'printReport';
      box.className = 'print-only';
      document.body.appendChild(box);
    }
    box.innerHTML = Report.build(monthValue);
    document.body.classList.add('printing-report');
    const done = () => document.body.classList.remove('printing-report');
    window.addEventListener('afterprint', done, { once: true });
    setTimeout(() => { window.print(); setTimeout(done, 1000); }, 60);
    return true;
  }
};
