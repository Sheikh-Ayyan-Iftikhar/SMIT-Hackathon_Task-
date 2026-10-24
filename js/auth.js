/* ============================================================
   auth.js — first-run setup, login / logout, session guards,
   and password changes for both roles.
   ============================================================ */

const Auth = {

  /* ---------- First-run: creates the company + the Admin account ---------- */
  setupCompany(data) {
    const errors = {};
    const name = String(data.companyName || '').trim();
    const adminName = String(data.adminName || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '');
    const confirm = String(data.confirm || '');

    if (!name) errors.companyName = 'Company name is required.';
    if (!adminName) errors.adminName = 'Your name is required.';
    if (!email) errors.email = 'Email is required.';
    else if (!UI.isEmail(email)) errors.email = 'Enter a valid email address.';
    else if (findUserByEmail(email)) errors.email = 'This email is already in use.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 6) errors.password = 'Use at least 6 characters.';
    if (confirm !== password) errors.confirm = 'Passwords do not match.';

    if (Object.keys(errors).length) return { ok: false, errors };

    if (hasCompany()) return { ok: false, errors: { companyName: 'Setup has already been completed.' } };

    const company = {
      name: name,
      startTime: '09:00',
      graceMinutes: 15,
      leaveQuota: 12,
      workingDays: [1, 2, 3, 4, 5],
      currency: 'PKR',
      createdAt: new Date().toISOString()
    };

    const admin = {
      id: nextId(),
      name: adminName,
      email: email,
      password: password,
      role: 'admin',
      department: '',
      salary: 0,
      createdAt: new Date().toISOString()
    };

    if (!setCompany(company)) return { ok: false, errors: { companyName: 'Could not save to this browser.' } };
    if (!addUser(admin)) { localStorage.removeItem(DB.COMPANY); return { ok: false, errors: { companyName: 'Could not save the Admin account.' } }; }

    setSession({ userId: admin.id });
    return { ok: true, user: admin };
  },

  /* ---------- Login ---------- */
  login(email, password) {
    const errors = {};
    const e = String(email || '').trim().toLowerCase();
    const p = String(password || '');

    if (!e) errors.email = 'Email is required.';
    else if (!UI.isEmail(e)) errors.email = 'Enter a valid email address.';
    if (!p) errors.password = 'Password is required.';

    if (Object.keys(errors).length) return { ok: false, errors };

    const user = findUserByEmail(e);
    if (!user || user.password !== p) return { ok: false, errors: { password: 'Email or password is incorrect.' } };

    setSession({ userId: user.id });
    return { ok: true, user };
  },

  logout() {
    clearSession();
    location.href = '../index.html';
  },

  /* ---------- Guards: every protected page calls one of these ---------- */
  requireRole(role) {
    const user = currentUser();
    if (!user) { location.replace('../index.html'); return null; }
    if (user.role !== role) {
      location.replace(user.role === 'admin' ? 'admin.html' : 'employee.html');
      return null;
    }
    return user;
  },

  /* Any logged-in user (used by the payslip page, which both roles can open). */
  requireUser() {
    const user = currentUser();
    if (!user) { location.replace('../index.html'); return null; }
    return user;
  },

  /* ---------- Change password (rule 02: own account only) ---------- */
  changePassword(userId, current, next, confirmNext) {
    const user = findUser(userId);
    if (!user) return { ok: false, error: 'Account not found.' };
    if (user.password !== current) return { ok: false, error: 'Your current password is incorrect.' };
    if (String(next || '').length < 6) return { ok: false, error: 'New password must be at least 6 characters.' };
    if (next !== confirmNext) return { ok: false, error: 'New passwords do not match.' };
    if (next === current) return { ok: false, error: 'Choose a password you have not used before.' };
    if (!updateUser(userId, { password: next })) return { ok: false, error: 'Could not save the new password.' };
    return { ok: true };
  }
};
