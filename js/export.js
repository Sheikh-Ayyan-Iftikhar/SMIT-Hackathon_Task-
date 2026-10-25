/* ============================================================
   export.js — CSV downloads for the Admin
   Attendance export follows the Admin's own rules (late /
   half-day / absent) and marks approved leave days.
   ============================================================ */

const Export = {

  cell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  },

  toCSV(headers, rows) {
    const line = arr => arr.map(Export.cell).join(',');
    return '﻿' + [line(headers)].concat(rows.map(line)).join('\r\n') + '\r\n';
  },

  download(filename, text) {
    try {
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
      return true;
    } catch (e) {
      return false;
    }
  },

  stamp() {
    const d = new Date();
    const p = n => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  },

  /* Worked hours from a stored record, or '' when incomplete. */
  hours(rec) {
    if (!rec || !rec.checkIn || !rec.checkOut) return '';
    const a = timeToMinutes(rec.checkIn);
    const b = timeToMinutes(rec.checkOut);
    if (a == null || b == null || b <= a) return '';
    return ((b - a) / 60).toFixed(2);
  },

  /* One row per working day per employee for the chosen month
     (YYYY-MM). Falls back to a plain record dump when no month
     is given. Leave days come from the leave register. */
  attendance(monthValue) {
    const company = getCompany() || {};
    const emps = employees();
    const rows = [];
    let name = 'letmehire-attendance-' + Export.stamp();

    if (monthValue && /^\d{4}-\d{2}$/.test(monthValue)) {
      name = 'letmehire-attendance-' + monthValue;
      const parts = monthValue.split('-').map(Number);
      const days = new Date(parts[0], parts[1], 0).getDate();

      for (let d = 1; d <= days; d++) {
        const iso = monthValue + '-' + (d < 10 ? '0' : '') + d;
        if (!isWorkingDay(iso, company)) continue;
        const dow = new Date(parts[0], parts[1] - 1, d)
          .toLocaleDateString(undefined, { weekday: 'long' });
        const onLeave = getLeaves().filter(l => l.status === 'approved' && l.from <= iso && l.to >= iso);

        emps.forEach(u => {
          const rec = attendanceFor(u.id, iso);
          let status = rec ? Attendance.computeStatus(rec, company) : 'absent';
          if (!rec && onLeave.some(l => l.userId === u.id)) status = 'on-leave';
          rows.push([
            iso, dow, u.name, u.department || '', status,
            rec ? rec.checkIn : '', rec ? rec.checkOut : '', Export.hours(rec),
            rec && rec.late ? 'yes' : 'no',
            rec && rec.meta && rec.meta.source === 'camera' ? 'camera' : (rec ? 'manual' : '')
          ]);
        });
      }
    } else {
      getAttendance().slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach(rec => {
        const u = findUser(rec.userId);
        rows.push([
          rec.date, '', u ? u.name : '', u ? (u.department || '') : '',
          Attendance.computeStatus(rec, company), rec.checkIn, rec.checkOut || '',
          Export.hours(rec), rec.late ? 'yes' : 'no',
          rec.meta && rec.meta.source === 'camera' ? 'camera' : 'manual'
        ]);
      });
    }

    return {
      filename: name + '.csv',
      count: rows.length,
      csv: Export.toCSV(
        ['Date', 'Day', 'Employee', 'Department', 'Status', 'Check-in', 'Check-out', 'Hours', 'Late', 'Method'],
        rows
      )
    };
  },

  employees() {
    const quota = Number((getCompany() || {}).leaveQuota || 0);
    const year = new Date().getFullYear();
    const list = employees().map(u => {
      const used = Leave.usedDays(u.id, year);
      return [
        u.name, u.email, u.department || '', u.role,
        Number(u.salary || 0), quota, Math.max(quota - used, 0),
        u.createdAt ? String(u.createdAt).slice(0, 10) : ''
      ];
    });
    return {
      filename: 'letmehire-employees-' + Export.stamp() + '.csv',
      count: list.length,
      csv: Export.toCSV(
        ['Name', 'Email', 'Department', 'Role', 'Salary', 'Leave quota', 'Leave left', 'Joined'],
        list
      )
    };
  },

  /* Buttons on the dashboard. Return false when there is nothing to export. */
  attendanceFile(monthValue) {
    const out = Export.attendance(monthValue);
    if (!out.count) return false;
    return Export.download(out.filename, out.csv);
  },

  employeesFile() {
    const out = Export.employees();
    if (!out.count) return false;
    return Export.download(out.filename, out.csv);
  }
};
