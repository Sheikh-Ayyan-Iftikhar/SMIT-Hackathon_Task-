/* ============================================================
   attendance.js — check-in / check-out and the status rules
   that the Admin configures in settings.

   • Late = check-in after office start + grace minutes
   • One check-in per day; check-out only after check-in
   • Work hours = out - in ; under 5 hours = half day
   • No record on a working day = absent (derived, not stored)
   ============================================================ */

const HALF_DAY_HOURS = 5;

const Attendance = {

  /* Recompute the display status of a stored record from the Admin's rules. */
  computeStatus(rec, company) {
    const c = company || getCompany() || { startTime: '09:00', graceMinutes: 0 };
    const inMin = timeToMinutes(rec.checkIn);
    const startMin = timeToMinutes(c.startTime);
    const grace = Number(c.graceMinutes || 0);

    if (rec.checkOut && inMin !== null) {
      const outMin = timeToMinutes(rec.checkOut);
      const hours = (outMin - inMin) / 60;
      return hours < HALF_DAY_HOURS ? 'half-day' : (rec.late ? 'late' : 'present');
    }
    return rec.late ? 'late' : 'present';
  },

  refresh(rec) {
    rec.status = Attendance.computeStatus(rec);
    rec.updatedAt = new Date().toISOString();
    return rec;
  },

  /* ---------- Employee action: check in ----------
     meta is optional; it is only set by the camera flow and carries
     { source, photo, lat, lng, accuracy, face, geo, at }. */
  checkIn(userId, meta) {
    const c = getCompany();
    if (!c) return { ok: false, error: 'The company has not been set up yet.' };

    const n = Number(userId);
    const date = todayISO();
    const existing = attendanceFor(n, date);
    if (existing) return { ok: false, error: 'You already checked in today.' };

    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    const startMin = timeToMinutes(c.startTime);
    const grace = Number(c.graceMinutes || 0);
    const late = timeToMinutes(hhmm) > startMin + grace;

    const rec = {
      id: nextId(),
      userId: n,
      date: date,
      checkIn: hhmm,
      checkOut: '',
      late: late,
      status: late ? 'late' : 'present',
      meta: (meta && typeof meta === 'object') ? meta : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!saveAttendance(rec)) return { ok: false, error: 'Could not save to this browser.' };
    const viaCamera = rec.meta && rec.meta.source === 'camera';
    return { ok: true, record: rec, late: late, message: late
      ? (viaCamera ? 'Camera check-in at ' : 'Checked in at ') + hhmm + ' — late (after ' + c.startTime + ' + ' + grace + ' min).'
      : (viaCamera ? 'Camera check-in at ' : 'Checked in at ') + hhmm + '.' };
  },

  /* ---------- Employee action: check out ---------- */
  checkOut(userId, meta) {
    const n = Number(userId);
    const date = todayISO();
    const rec = attendanceFor(n, date);

    if (!rec) return { ok: false, error: 'Check in first — there is no record for today yet.' };
    if (rec.checkOut) return { ok: false, error: 'You already checked out today.' };

    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    if (timeToMinutes(hhmm) <= timeToMinutes(rec.checkIn)) {
      return { ok: false, error: 'Check-out must be after check-in.' };
    }

    rec.checkOut = hhmm;
    if (meta && typeof meta === 'object') rec.outMeta = meta;
    Attendance.refresh(rec);
    if (!saveAttendance(rec)) return { ok: false, error: 'Could not save to this browser.' };

    const hours = ((timeToMinutes(rec.checkOut) - timeToMinutes(rec.checkIn)) / 60).toFixed(1);
    return {
      ok: true, record: rec,
      message: rec.status === 'half-day'
        ? 'Checked out at ' + hhmm + ' — under ' + HALF_DAY_HOURS + ' hours, marked half day.'
        : 'Checked out at ' + hhmm + ' · ' + hours + ' hours worked.'
    };
  },

  /* ---------- Derived "absent" for a date ---------- */
  /* Only employees with no record on a working day count as absent. */
  absentOn(dateISO, company) {
    const c = company || getCompany();
    if (!c || !isWorkingDay(dateISO, c)) return [];
    const recorded = {};
    attendanceOn(dateISO).forEach(a => { recorded[a.userId] = true; });
    return employees().filter(u => !recorded[u.id]);
  },

  /* ---------- Counts used by the dashboard and the helper ---------- */
  summaryOn(dateISO, opts) {
    opts = opts || {};
    const company = getCompany();
    const scoped = opts.scopeUserId
      ? attendanceOn(dateISO).filter(a => a.userId === Number(opts.scopeUserId))
      : attendanceOn(dateISO);

    const counts = { present: 0, late: 0, 'half-day': 0 };
    scoped.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

    const lateArrivals = scoped.filter(a => a.late).length;
    const absent = opts.scopeUserId
      ? (isWorkingDay(dateISO, company) && !attendanceFor(Number(opts.scopeUserId), dateISO) ? 1 : 0)
      : Attendance.absentOn(dateISO, company).length;

    return { present: counts.present, late: counts.late, halfDay: counts['half-day'], lateArrivals: lateArrivals, absent: absent, records: scoped.length };
  }
};
