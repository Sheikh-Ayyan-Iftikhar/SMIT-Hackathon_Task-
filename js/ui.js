/* ============================================================
   ui.js — shared helpers: escaping, formatting, toasts,
   confirmation modal, and the responsive app shell.
   ============================================================ */

const UI = {

  esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  initials(name) {
    const parts = String(name || '').trim().split(/\s+/);
    const s = (parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '');
    return (s || '?').toUpperCase();
  },

  fmtDate(iso) {
    if (!iso) return '—';
    const p = String(iso).split('-');
    if (p.length !== 3) return iso;
    const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  },

  fmtMoney(n) {
    const v = Number(n || 0);
    const cur = (getCompany() && getCompany().currency) || 'PKR';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v);
    } catch (e) {
      return cur + ' ' + v.toLocaleString();
    }
  },

  /* ---------- Toasts ---------- */
  toast(msg, kind) {
    let wrap = document.getElementById('toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toasts';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (kind === 'bad' ? 'bad' : 'ok');
    el.setAttribute('role', 'status');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3000);
  },

  /* ---------- Confirmation modal ---------- */
  confirm(opts, onYes) {
    const o = Object.assign({ title: 'Are you sure?', message: '', confirm: 'Confirm', danger: false }, opts || {});
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML =
      '<div class="modal-box" role="dialog" aria-modal="true" aria-label="' + UI.esc(o.title) + '">' +
      '  <div class="modal-hd">' + UI.esc(o.title) + '<button type="button" data-x aria-label="Close">&times;</button></div>' +
      '  <div class="modal-bd"><p class="mb-0 muted" style="font-size:.9rem">' + UI.esc(o.message) + '</p></div>' +
      '  <div class="modal-ft">' +
      '    <button type="button" class="btn btn-outline" data-no>Cancel</button>' +
      '    <button type="button" class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-yes>' + UI.esc(o.confirm) + '</button>' +
      '  </div></div>';
    document.body.appendChild(back);
    const close = () => { back.remove(); };
    back.classList.add('on');
    back.querySelector('[data-x]').onclick = close;
    back.querySelector('[data-no]').onclick = close;
    back.querySelector('[data-yes]').onclick = () => { close(); onYes(); };
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('[data-yes]').focus();
  },

  /* ---------- Empty state ---------- */
  empty(icon, title, message, actionHtml) {
    return '<div class="empty">' +
      '<div class="ico">' + icon + '</div>' +
      '<h5>' + UI.esc(title) + '</h5>' +
      '<p>' + UI.esc(message) + '</p>' +
      (actionHtml || '') +
      '</div>';
  },

  /* ---------- Field validation display ---------- */
  setError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const field = input.closest('.field');
    if (!field) return;
    if (message) {
      field.classList.add('invalid');
      const e = field.querySelector('.err');
      if (e) e.textContent = message;
      input.setAttribute('aria-invalid', 'true');
    } else {
      field.classList.remove('invalid');
      input.removeAttribute('aria-invalid');
    }
  },

  clearErrors(scope) {
    const root = scope || document;
    root.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
  },

  alertBox(el, message, kind) {
    if (!el) return;
    el.className = 'alert alert-' + (kind || 'error') + ' show';
    el.textContent = message;
  },

  alertHide(el) {
    if (!el) return;
    el.className = 'alert';
    el.textContent = '';
  },

  /* ---------- Field validators ---------- */
  required(v) { return String(v || '').trim().length > 0; },

  isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()); },

  statusBadge(status) {
    const map = {
      present: 'badge-ok', late: 'badge-warn', 'half-day': 'badge-info',
      absent: 'badge-bad', approved: 'badge-ok', pending: 'badge-warn',
      rejected: 'badge-bad'
    };
    const cls = map[status] || 'badge-mute';
    return '<span class="badge ' + cls + '">' + UI.esc(String(status || '').replace('-', ' ')) + '</span>';
  },

  /* ---------- Theme (dark / light) ---------- */
  theme() {
    try { return localStorage.getItem('hcm_theme') === 'dark' ? 'dark' : 'light'; }
    catch (e) { return 'light'; }
  },

  setTheme(t) {
    const v = t === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', v);
    try { localStorage.setItem('hcm_theme', v); } catch (e) {}
    return v;
  },

  themeIcon(t) {
    return (t || UI.theme()) === 'dark' ? '&#9788;' : '&#9789;';
  },

  toggleTheme() {
    const next = UI.setTheme(UI.theme() === 'dark' ? 'light' : 'dark');
    UI.toast(next === 'dark' ? 'Dark mode on' : 'Light mode on');
    if (typeof Charts !== 'undefined' && Charts && Charts.refresh) Charts.refresh();
    return next;
  },

  /* ---------- App shell ----------
     opts = { active, title, subtitle, nav: [{ href, label, icon }] } */
  shell(opts) {
    const user = currentUser();
    const company = getCompany();
    const aiKeySaved = (typeof AI !== 'undefined' && AI.captureHash) ? AI.captureHash() : false;
    const themeNow = UI.theme();

    const links = opts.nav.map(n =>
      '<a class="lk' + (n.href === opts.active ? ' on' : '') + '" href="' + n.href + '"' +
      (n.href === opts.active ? ' aria-current="page"' : '') + '>' +
      '<span aria-hidden="true">' + n.icon + '</span>' + UI.esc(n.label) + '</a>'
    ).join('');

    const coName = company ? company.name : 'LetMeHire';
    const markChar = UI.esc((String(coName).trim()[0] || 'L').toUpperCase());

    document.body.innerHTML =
      '<div class="scrim" id="scrim"></div>' +
      '<nav class="nav" id="nav" aria-label="Main">' +
      '  <div class="brand"><span class="mark" aria-hidden="true">' + markChar + '</span><span>' + UI.esc(coName) + '</span>' +
      '    <span class="tag">LetMeHire</span></div>' +
      '  <div class="role-pill">' + UI.esc(user.role) + ' workspace</div>' +
      '  <div class="links">' + links + '</div>' +
      '  <div class="foot">' +
      '    <div class="who">' +
      '      <span class="av">' + UI.esc(UI.initials(user.name)) + '</span>' +
      '      <span class="grow"><span class="nm txt" style="display:block">' + UI.esc(user.name) + '</span>' +
      '      <span class="rl">' + UI.esc(user.email) + '</span></span>' +
      '    </div>' +
      '    <button class="btn btn-outline btn-sm btn-block" id="signOut">Sign out</button>' +
      '  </div>' +
      '</nav>' +
      '<div class="main">' +
      '  <header class="topbar">' +
      '    <div class="flex">' +
      '      <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false">&#9776;</button>' +
      '      <div><h1 class="ttl">' + UI.esc(opts.title) + '</h1>' +
      (opts.subtitle ? '<div class="sub">' + UI.esc(opts.subtitle) + '</div>' : '') + '</div>' +
      '    </div>' +
      '    <div class="flex nowrap" style="gap:.5rem">' +
      '      <button class="btn btn-outline btn-sm" id="themeBtn" type="button" aria-label="Toggle dark mode" aria-pressed="' +
      (themeNow === 'dark') + '" title="Toggle dark mode">' + UI.themeIcon(themeNow) + '</button>' +
      '      <div class="datechip small nowrap">' + UI.esc(new Date().toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })) + '</div>' +
      '    </div>' +
      '  </header>' +
      '  <main class="page" id="page"></main>' +
      '</div>';

    const nav = document.getElementById('nav');
    const scrim = document.getElementById('scrim');
    const burger = document.getElementById('burger');
    const toggle = () => {
      const open = nav.classList.toggle('open');
      scrim.classList.toggle('on', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.onclick = toggle;
    scrim.onclick = toggle;
    document.getElementById('signOut').onclick = () => { Auth.logout(); };

    const themeBtn = document.getElementById('themeBtn');
    themeBtn.onclick = () => {
      const t = UI.toggleTheme();
      themeBtn.innerHTML = UI.themeIcon(t);
      themeBtn.setAttribute('aria-pressed', String(t === 'dark'));
    };

    if (aiKeySaved) UI.toast('API key saved in this browser');

    return document.getElementById('page');
  }
};
