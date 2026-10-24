/* ============================================================
   storage.js — read/write helpers for the five localStorage keys
   hcm_company · hcm_users · hcm_attendance · hcm_leaves · hcm_session
   (+ hcm_announcements for the announcements permission)
   ============================================================ */

const DB = {
  COMPANY: 'hcm_company',
  USERS: 'hcm_users',
  ATTENDANCE: 'hcm_attendance',
  LEAVES: 'hcm_leaves',
  SESSION: 'hcm_session',
  ANNOUNCEMENTS: 'hcm_announcements'
};

function dbRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error('storage read failed', key, e);
    return fallback;
  }
}

function dbWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('storage write failed', key, e);
    return false;
  }
}

function dbClear() {
  Object.keys(DB).forEach(k => localStorage.removeItem(DB[k]));
}

/* Monotonic id source. Date.now() alone collides when two records are
   created inside the same millisecond (bulk imports, seeded demos). */
let __idSeq = 0;
function nextId() {
  const t = Date.now();
  __idSeq = (t > __idSeq) ? t : __idSeq + 1;
  return __idSeq;
}

/* ---------- Company ---------- */
function getCompany() { return dbRead(DB.COMPANY, null); }
function setCompany(c) { return dbWrite(DB.COMPANY, c); }
function hasCompany() { const c = getCompany(); return !!(c && c.name); }

/* ---------- Users ---------- */
function getUsers() { return dbRead(DB.USERS, []); }
function setUsers(list) { return dbWrite(DB.USERS, list); }

function findUserByEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return getUsers().find(u => u.email.toLowerCase() === e) || null;
}
function findUser(id) {
  const n = Number(id);
  return getUsers().find(u => u.id === n) || null;
}
function employees() { return getUsers().filter(u => u.role === 'employee'); }
function employeeById(id) { const n = Number(id); const u = findUser(n); return u && u.role === 'employee' ? u : null; }

function addUser(u) {
  const list = getUsers();
  list.push(u);
  return setUsers(list);
}
function updateUser(id, patch) {
  const n = Number(id);
  const list = getUsers();
  const i = list.findIndex(u => u.id === n);
  if (i < 0) return false;
  list[i] = Object.assign({}, list[i], patch);
  return setUsers(list);
}
function removeUser(id) {
  const n = Number(id);
  return setUsers(getUsers().filter(u => u.id !== n));
}

/* ---------- Session ---------- */
function getSession() { return dbRead(DB.SESSION, null); }
function setSession(s) { return dbWrite(DB.SESSION, s); }
function clearSession() { localStorage.removeItem(DB.SESSION); }
function currentUser() {
  const s = getSession();
  if (!s) return null;
  const u = findUser(s.userId);
  return u || null;
}

/* ---------- Attendance ---------- */
function getAttendance() { return dbRead(DB.ATTENDANCE, []); }
function setAttendance(list) { return dbWrite(DB.ATTENDANCE, list); }

function attendanceFor(userId, date) {
  const n = Number(userId);
  return getAttendance().find(a => a.userId === n && a.date === date) || null;
}
function attendanceOn(date) {
  return getAttendance().filter(a => a.date === date);
}
function attendanceOf(userId) {
  const n = Number(userId);
  return getAttendance().filter(a => a.userId === n).sort((a, b) => b.date.localeCompare(a.date));
}
function saveAttendance(rec) {
  const list = getAttendance();
  const i = list.findIndex(a => a.id === rec.id);
  if (i >= 0) list[i] = rec; else list.push(rec);
  if (setAttendance(list)) return true;

  /* Storage quota hit: camera snapshots are the biggest payload.
     Drop the oldest thumbnails (keep the newest 50) and retry. */
  const withPhoto = list
    .filter(a => a.meta && a.meta.photo)
    .sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  withPhoto.forEach((a, idx) => { if (idx >= 50) delete a.meta.photo; });
  if (setAttendance(list)) return true;

  /* Still full: keep every record, store no photos. */
  list.forEach(a => { if (a.meta) delete a.meta.photo; });
  return setAttendance(list);
}

/* ---------- Leaves ---------- */
function getLeaves() { return dbRead(DB.LEAVES, []); }
function setLeaves(list) { return dbWrite(DB.LEAVES, list); }

function leavesOf(userId) {
  const n = Number(userId);
  return getLeaves().filter(l => l.userId === n).sort((a, b) => b.id - a.id);
}
function saveLeave(rec) {
  const list = getLeaves();
  const i = list.findIndex(l => l.id === rec.id);
  if (i >= 0) list[i] = rec; else list.push(rec);
  return setLeaves(list);
}

/* ---------- Announcements ---------- */
function getAnnouncements() { return dbRead(DB.ANNOUNCEMENTS, []); }
function setAnnouncements(list) { return dbWrite(DB.ANNOUNCEMENTS, list); }

/* ---------- Shared calendar helpers (used by leave + payslip) ----------
   workingDays are stored as 0..6 (0 = Sunday), matching Date.getDay(). */

function todayISO(d) {
  const t = d || new Date();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return t.getFullYear() + '-' + m + '-' + day;
}

function isWorkingDay(dateISO, company) {
  const c = company || getCompany();
  if (!c || !Array.isArray(c.workingDays)) return true;
  const parts = dateISO.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return c.workingDays.indexOf(d.getDay()) !== -1;
}

/* Count working days in an inclusive range (weekends / non-working days skipped). */
function countWorkingDays(fromISO, toISO, company) {
  const c = company || getCompany();
  if (!c || !Array.isArray(c.workingDays)) return 0;
  const p1 = fromISO.split('-').map(Number);
  const p2 = toISO.split('-').map(Number);
  const start = new Date(p1[0], p1[1] - 1, p1[2]);
  const end = new Date(p2[0], p2[1] - 1, p2[2]);
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  let n = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (c.workingDays.indexOf(cur.getDay()) !== -1) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

/* Working days in a given calendar month, used by the payslip. */
function workingDaysInMonth(year, month, company) {
  const c = company || getCompany();
  if (!c || !Array.isArray(c.workingDays)) return 0;
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let n = 0;
  const d = new Date(first);
  while (d <= last) {
    if (c.workingDays.indexOf(d.getDay()) !== -1) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

/* HH:MM -> minutes since midnight */
function timeToMinutes(hhmm) {
  if (!hhmm) return null;
  const p = hhmm.split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}
