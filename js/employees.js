/* ============================================================
   employees.js — add / edit / delete employee accounts
   Rule 04: adding an employee also creates that employee's login.
   Rule 05: list with search and department filter.
   ============================================================ */

const Employees = {

  /* Distinct department names, sorted — used by filters and selects. */
  departments() {
    const set = {};
    employees().forEach(u => { if (u.department) set[u.department] = true; });
    return Object.keys(set).sort((a, b) => a.localeCompare(b));
  },

  /* Validate one employee form. Returns {} when the form is valid. */
  validate(data, opts) {
    opts = opts || {};
    const errors = {};
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const salary = Number(data.salary);
    const password = String(data.password || '');

    if (!name) errors.name = 'Name is required.';
    if (!email) errors.email = 'Email is required.';
    else if (!UI.isEmail(email)) errors.email = 'Enter a valid email address.';
    else {
      const existing = findUserByEmail(email);
      if (existing && existing.id !== opts.editingId) errors.email = 'This email is already in use.';
    }
    if (!(salary > 0)) errors.salary = 'Salary must be greater than 0.';

    if (!opts.editingId && !password) errors.password = 'A password is required to create the login.';
    else if (password && password.length < 6) errors.password = 'Use at least 6 characters.';

    if (!opts.editingId && !data.department) errors.department = 'Choose a department.';

    return errors;
  },

  /* Admin adds an employee + their login. */
  create(data, adminId) {
    const errors = Employees.validate(data, {});
    if (Object.keys(errors).length) return { ok: false, errors };

    const user = {
      id: nextId(),
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      password: String(data.password),
      role: 'employee',
      department: String(data.department).trim(),
      salary: Number(data.salary),
      createdBy: adminId,
      createdAt: new Date().toISOString()
    };

    if (!addUser(user)) return { ok: false, errors: { name: 'Could not save this employee to the browser.' } };
    return { ok: true, user: user };
  },

  update(id, data) {
    const existing = findUser(id);
    if (!existing) return { ok: false, errors: { name: 'This employee no longer exists.' } };

    const errors = Employees.validate(data, { editingId: Number(id) });
    if (Object.keys(errors).length) return { ok: false, errors };

    const patch = {
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      department: String(data.department).trim(),
      salary: Number(data.salary)
    };
    if (String(data.password || '')) patch.password = String(data.password);

    if (!updateUser(id, patch)) return { ok: false, errors: { name: 'Could not save your changes.' } };
    return { ok: true, user: findUser(id) };
  },

  /* Deleting removes the login together with the records that point at it,
     so nothing is left orphaned in attendance or leave data. */
  remove(id) {
    const n = Number(id);
    const user = findUser(n);
    if (!user) return { ok: false, error: 'This employee no longer exists.' };
    if (user.role === 'admin') return { ok: false, error: 'The Admin account cannot be deleted.' };

    const removedAttendance = getAttendance().filter(a => a.userId === n);
    if (removedAttendance.length) setAttendance(getAttendance().filter(a => a.userId !== n));
    const removedLeaves = getLeaves().filter(l => l.userId === n);
    if (removedLeaves.length) setLeaves(getLeaves().filter(l => l.userId !== n));

    if (!removeUser(n)) return { ok: false, error: 'Could not delete this employee.' };

    const session = getSession();
    if (session && session.userId === n) clearSession();

    return { ok: true, user: user, removedAttendance: removedAttendance.length, removedLeaves: removedLeaves.length };
  },

  /* Rule 05: search by name or email + department filter. */
  filter(list, criteria) {
    const c = criteria || {};
    let out = list.slice();
    const q = String(c.q || '').trim().toLowerCase();
    if (q) {
      out = out.filter(u =>
        u.name.toLowerCase().indexOf(q) !== -1 ||
        u.email.toLowerCase().indexOf(q) !== -1 ||
        String(u.id).indexOf(q) !== -1
      );
    }
    if (c.department) out = out.filter(u => u.department === c.department);
    return out;
  }
};
