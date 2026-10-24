/* ============================================================
   leave.js — leave requests, quota and approval decisions.

   Rules:
   • From date must be on or before To date
   • Count working days only (skip non-working days)
   • Cannot overlap another leave
   • Cannot exceed the yearly quota set by the Admin
   • Approve / reject requires a comment
   ============================================================ */

const Leave = {

  /* Working days between two dates, inclusive. */
  days(fromISO, toISO) {
    return countWorkingDays(fromISO, toISO);
  },

  /* Approved leave days already used by an employee in a year. */
  usedDays(userId, year) {
    const n = Number(userId);
    const y = Number(year);
    return getLeaves()
      .filter(l => l.userId === n && l.status === 'approved' && Number(l.from.slice(0, 4)) === y)
      .reduce((sum, l) => sum + Number(l.days || 0), 0);
  },

  /* Remaining quota for the current year. */
  balance(userId, year) {
    const c = getCompany() || { leaveQuota: 0 };
    const y = Number(year || new Date().getFullYear());
    const quota = Number(c.leaveQuota || 0);
    const used = Leave.usedDays(userId, y);
    return { year: y, quota: quota, used: used, left: Math.max(0, quota - used) };
  },

  /* Overlapping approved/pending requests for the same employee. */
  overlap(userId, fromISO, toISO, ignoreId) {
    const n = Number(userId);
    return getLeaves().find(l =>
      l.userId === n &&
      l.id !== ignoreId &&
      (l.status === 'pending' || l.status === 'approved') &&
      !(toISO < l.from || fromISO > l.to)
    ) || null;
  },

  /* ---------- Validation (errors are shown next to the field) ---------- */
  validate(data, userId, ignoreId) {
    const errors = {};
    const type = String(data.type || '').trim();
    const from = String(data.from || '').trim();
    const to = String(data.to || '').trim();

    if (!type) errors.type = 'Choose a leave type.';
    if (!from) errors.from = 'Start date is required.';
    if (!to) errors.to = 'End date is required.';

    if (from && to) {
      if (to < from) errors.to = 'End date must be on or after the start date.';
      else {
        const days = Leave.days(from, to);
        if (days === 0) errors.to = 'That range contains no working days.';

        const clash = Leave.overlap(userId, from, to, ignoreId);
        if (clash) errors.to = 'Overlaps an existing request (' + clash.from + ' to ' + clash.to + ').';

        const year = Number(from.slice(0, 4));
        const balance = Leave.balance(userId, year);
        if (days > balance.left) {
          errors.to = 'Only ' + balance.left + ' of ' + balance.quota + ' leave days left this year.';
        }
      }
    }
    return errors;
  },

  /* ---------- Employee applies ---------- */
  apply(data, userId) {
    const errors = Leave.validate(data, userId, null);
    if (Object.keys(errors).length) return { ok: false, errors };

    const from = String(data.from).trim();
    const to = String(data.to).trim();

    const rec = {
      id: nextId(),
      userId: Number(userId),
      type: String(data.type).trim(),
      from: from,
      to: to,
      days: Leave.days(from, to),
      reason: String(data.reason || '').trim(),
      status: 'pending',
      comment: '',
      decidedBy: null,
      decidedAt: null,
      createdAt: new Date().toISOString()
    };

    if (!saveLeave(rec)) return { ok: false, errors: { type: 'Could not save to this browser.' } };
    return { ok: true, leave: rec };
  },

  /* ---------- Admin decides ---------- */
  decide(leaveId, decision, comment, adminId) {
    const list = getLeaves();
    const i = list.findIndex(l => l.id === Number(leaveId));
    if (i < 0) return { ok: false, error: 'This request no longer exists.' };
    if (list[i].status !== 'pending') return { ok: false, error: 'This request has already been decided.' };

    const note = String(comment || '').trim();
    if (!note) return { ok: false, error: 'A comment is required.' };
    if (decision === 'approved') {
      const balance = Leave.balance(list[i].userId, Number(list[i].from.slice(0, 4)));
      if (Number(list[i].days) > balance.left) {
        return { ok: false, error: 'This would exceed the yearly quota (only ' + balance.left + ' days left).' };
      }
    }

    list[i].status = decision;
    list[i].comment = note;
    list[i].decidedBy = adminId;
    list[i].decidedAt = new Date().toISOString();
    if (!setLeaves(list)) return { ok: false, error: 'Could not save to this browser.' };
    return { ok: true, leave: list[i] };
  },

  /* ---------- Queries used by the dashboard and helper ---------- */
  pending() { return getLeaves().filter(l => l.status === 'pending').sort((a, b) => a.id - b.id); },

  onLeaveToday(dateISO) {
    const d = dateISO || todayISO();
    return getLeaves().filter(l => l.status === 'approved' && l.from <= d && l.to >= d);
  }
};
