# LetMeHire

A small HR web app built with **HTML, CSS and JavaScript only** — no framework, no backend. All data lives in the browser's `localStorage`, and the app **starts empty**: an Admin sets up the company and adds employees, and every number on screen is calculated from what people actually do in the app.

Built for the **Saylani Hackathon — Beginner Track** (24 Oct 2026, Zaitoon Ashraf IT Park).

---

## Run it

No build step and no install.

1. Open `index.html` in a browser (double-click it, or use a local server).
2. Complete **first-run setup**: company name + your Admin account.
3. Sign in and start adding employees.

> It works from `file://`, but a static server avoids oddities with relative paths:
> `npx serve .` or `python -m http.server`

### Demo in 60 seconds (what a judge should click)

1. Open `index.html` → **first-run setup** → company + Admin account (the app starts empty).
2. Sign in → **Employees → Add employee** (this creates that person's login) → add a second one.
3. Log in as the employee → **Camera check-in** (or Quick) → **Apply for leave**.
4. Back to Admin → **Leave requests → Approve** with a comment.
5. **Dashboard** — totals, two charts, **Monthly report → Preview**, then **Attendance CSV**.
6. **Payslips** → pick the month → **Print / save as PDF**.
7. Ask the **Smart helper**: *"How many employees do we have?"*, then as the employee *"How many leave days do I have left?"*.
8. Moon/sun button for **dark mode**; resize to a phone width to see the responsive layout.

---

## PDF checklist

Everything the Beginner Track PDF asks for, and where it lives:

| PDF requirement | Status | Where / how it is proven |
|---|---|---|
| HTML, CSS, JavaScript only — no framework, no backend | ✅ | no dependencies anywhere in the repo |
| Data saved with `localStorage` (`hcm_company`, `hcm_users`, `hcm_attendance`, `hcm_leaves`, `hcm_session`) | ✅ | `js/storage.js` read/write helpers reused by every page (+ `hcm_announcements` for rule 13) |
| Starts empty, first-run setup creates the company and the Admin | ✅ | `index.html` + `Auth.setupCompany`, tested by *"fresh install is empty"* |
| Two roles, every page checks who is logged in, Employees are sent back from Admin pages | ✅ | `Auth.requireRole` on all 7 pages, checked in headless Edge |
| Rule 01–03 setup, login/logout/change password, company settings | ✅ | `index.html`, `js/auth.js`, `pages/settings.html` (Admin) and `pages/employee.html` (Employee) |
| Rule 04 add employee (creates the login), edit, delete | ✅ | `pages/employees.html`, `Employees.create` |
| Rule 05 list with search + department filter | ✅ | `pages/employees.html` |
| Rule 06–07 check in / out, attendance records (Admin all, Employee own) | ✅ | `js/attendance.js`, both dashboards |
| Rule 08–09 apply leave, approve/reject with a comment, balance | ✅ | `js/leave.js`, `pages/leaves.html` |
| Rule 10 dashboard: company totals vs personal | ✅ | `pages/admin.html` / `pages/employee.html` |
| Rule 11 monthly payslip, print / save as PDF (Admin all, Employee own) | ✅ | `pages/payslip.html` + print stylesheet |
| Rule 12 smart helper: Admin all data, Employee own data | ✅ | `js/helper.js` (local keywords) + `js/ai.js` (role-scoped facts), 214 assertions + live battery |
| Rule 13 announcements: Admin posts, Employee reads | ✅ | `pages/admin.html` form, employee dashboard list |
| Business rules: late, half day, absent, leave limits, payslip maths, form errors | ✅ | `js/attendance.js`, `js/leave.js`, payslip maths — 101 sync assertions |
| Bonus: camera check-in (`getUserMedia`, geolocation, face-api.js) | ✅ | `js/camera.js`, verified with a real face (`score=0.740`) |
| Bonus: free LLM API via `fetch()`, key never committed | ✅ | `js/ai.js` — key lives only in `localStorage`, `git grep` finds nothing |
| Bonus: Chart.js charts, dark mode, CSV export, printable monthly report | ✅ | `js/charts.js`, theme toggle, `js/export.js`, `js/report.js` |
| Responsive design + a live hosted link | ✅ | 63/63 viewport checks clean · https://letmehire.vercel.app |
| Clean code: organised files, reusable functions, readable names | ✅ | 7 pages + 12 small single-purpose modules |
| Demo + README that explains how to use the app | ✅ | this file + the 60-second demo above |

---

## Pages (7)

| Page | What it does |
|---|---|
| `index.html` | Login + first-run setup (creates the company and the Admin account) |
| `pages/admin.html` | Admin dashboard — totals, today's attendance, pending leaves, announcements, **attendance charts**, **monthly report (print / CSV)**, smart helper |
| `pages/employees.html` | Add (creates a login), edit, delete, search, filter |
| `pages/leaves.html` | Approve or reject requests with a comment |
| `pages/settings.html` | Office start time, grace minutes, yearly leave quota, working days, office location for camera check-in |
| `pages/employee.html` | Employee dashboard — camera or quick check-in/out, my attendance, apply leave, helper |
| `pages/payslip.html` | Monthly salary slip — print or save as PDF |

## Files

```
index.html
css/style.css          single stylesheet
js/storage.js          localStorage read/write helpers + calendar helpers
js/auth.js             setup, login, guards, change password
js/employees.js        add/edit/delete employee, search & filter
js/attendance.js       check-in/out and the late / half-day rules
js/leave.js            leave validation, quota, approve/reject
js/helper.js           the smart helper chat box
js/ai.js               optional live assistant (OpenRouter), key kept in the browser only
js/charts.js           bonus: dashboard charts (Chart.js from CDN)
js/report.js           bonus: printable monthly attendance report
js/export.js           bonus: CSV downloads (attendance + employee list)
js/camera.js           bonus: camera check-in (getUserMedia + geolocation + face-api.js)
js/ui.js               escaping, toasts, modal, theme toggle, responsive shell
pages/*.html           the seven app pages
```

---

## Who can do what

Every protected page checks the session and the role on load. An Employee who opens an Admin page is sent back to their own dashboard.

| Functionality | Admin | Employee |
|---|---|---|
| First-run setup, company settings | Manage | — |
| Login, logout, change password | Own | Own |
| Add / edit / delete employee | Manage | — |
| Employee list (search + department filter) | All | — |
| Check in and check out (camera or quick) | — | Own |
| Attendance records | All | Own |
| Apply for leave, see status and balance | — | Own |
| Approve / reject leave with a comment | Manage | — |
| Dashboard | Company totals | Personal |
| Payslip (print / save as PDF) | All | Own |
| Smart helper | All data | Own data only |
| Announcements | Post | Read |

---

## Business rules (Admin decides them in Settings)

**Attendance**
- Late if check-in is after **office start + grace minutes** (e.g. 09:00 + 15).
- One check-in per day; check-out only after check-in.
- Work hours = out − in; **under 5 hours = half day**.
- **No record on a working day = absent** (missing records are never stored as fake absences — they are derived).

**Leave**
- From date must be on or before To date.
- Counted in **working days only** (non-working days skipped).
- Cannot overlap another pending/approved leave.
- Cannot exceed the yearly quota set by the Admin.

**Payslip**
- `per day = monthly salary ÷ working days in the month`
- `deduction = per day × (absent days + 0.5 × half days)`
- `net = salary − deduction`
- Future working days in an unfinished month are not counted as absent.

**Forms**
- Required fields, valid email, email not already used, salary greater than 0 — the error appears next to the field.

---

## Data (localStorage)

| Key | Stores |
|---|---|
| `hcm_company` | Company name, start time, grace minutes, leave quota, working days, currency, office location |
| `hcm_users` | Admin and employees: id, name, email, password, role, department, salary |
| `hcm_attendance` | One entry per employee per day: date, check-in, check-out, status, camera metadata (`meta` / `outMeta`) |
| `hcm_leaves` | Requests: employee id, type, from, to, days, reason, status, comment |
| `hcm_session` | Who is logged in right now |
| `hcm_announcements` | Announcements posted by the Admin |
| `hcm_ai_key` | Optional OpenRouter API key — **this browser only**, never written into the source tree |
| `hcm_ai_model` | Optional model slug for the assistant (default `openrouter/free`) |

Data is per-browser. Use **Reset app** on the sign-in page to return to the empty first-run state.

---

## Camera check-in (bonus, +10)

The Employee dashboard offers two ways to record attendance. **Quick check-in** is the plain button that always works; **Camera check-in** runs the three browser APIs the PDF asks for:

| Step | API | What it records |
|---|---|---|
| 1 · Camera | `navigator.mediaDevices.getUserMedia()` | live preview + a 160px JPEG thumbnail |
| 2 · Location | `navigator.geolocation` | latitude, longitude and accuracy |
| 3 · Face check | `face-api.js` (CDN) + `TinyFaceDetector` | `face: detected` / `unavailable` |

The **Check in** button only turns on when every required gate passes:

- the camera stream is live,
- a face is detected (if the model loaded — if it did not, the step says so and face checking is skipped rather than faked),
- and, **only if** an office area is configured in Settings with *"Require camera check-in to be inside the office area"* ticked, the coordinates fall inside the radius.

Everything that was used (or could not be used) is stored on the record as `meta`:

```json
{ "source": "camera", "face": "detected", "geo": "inside office area",
  "lat": 24.8607, "lng": 67.0011, "accuracy": 12, "meters": 4,
  "photo": "data:image/jpeg;base64,...", "at": "2026-10-25T..." }
```

Check-out stores the same shape under `outMeta`. The Admin dashboard and the Employee history show a **Method** column with the thumbnail and the face result.

Notes:
- Camera needs `https://` or `localhost`. If it is unavailable the dialog says exactly which step failed and the Quick button is still there.
- The face model is fetched from `cdn.jsdelivr.net`, so the first use needs an internet connection. Snapshots stay in `localStorage` — nothing is uploaded anywhere.
- `saveAttendance()` drops the oldest thumbnails if the browser storage quota is hit, so the app never loses a record because of a photo.

---

## Dashboard charts (bonus)

The Admin dashboard has an **Attendance insights** card with two Chart.js charts:

- **Attendance by department** — stacked bars for today: present, late, half day, on leave, absent, non-working day.
- **Last 14 days** — present / late / absent counts per day.

Both read the colours from the CSS variables, so they are rebuilt whenever the theme changes. If the Chart.js CDN cannot be reached the card says so instead of showing an empty box.

## Printable monthly report (bonus)

**Monthly report** card on the Admin dashboard: pick a month, then

- **Preview report** — the full report inline (headcount, present / late / half-day / leave / absent totals, one row per employee, a department rollup, and the rules footnote),
- **Print / save as PDF** — the same report in a print-only container, so the print dialog shows the report alone (no sidebar, no buttons) and always in the light palette.

Numbers come from the same code as the dashboard: `Attendance.computeStatus` for status and the leave register for leave days.

## CSV export (bonus)

Same card, two downloads (no server, a `Blob` + `download` link):

- **Attendance CSV** — one row per employee per working day of the selected month: date, weekday, employee, department, status (present / late / half-day / absent / on-leave), check-in, check-out, hours, late flag, method.
- **Employee list CSV** — name, email, department, role, salary, leave quota, leave left, joined.

Files are named `letmehire-attendance-2026-10.csv` and `letmehire-employees-2026-10-25.csv`. Every value is quoted/escaped properly, so Excel and Sheets open them as-is.

## Dark mode (bonus)

The moon/sun button in the top bar switches theme and remembers it under `hcm_theme`. The whole palette is CSS variables (`--surface`, `--line`, `--ink`, badge backgrounds, shadows), so cards, tables, forms, the chat, modals and the camera dialog all invert together. A `<script>` in every page head applies the saved theme before first paint (no white flash), charts recolour on toggle, and `@media print` forces the light palette so printed output stays readable.

---

## Smart helper

A chat box on both dashboards with two layers.

**Local answers (always on).** Keyword matching against the app's own data — no network, no cost, no invented numbers. Employees only ever receive their own records; company-wide questions are refused.

**Live AI (optional).** When an API key is saved, the question goes to [OpenRouter](https://openrouter.ai) together with a JSON block of **role-scoped facts** built from `localStorage`: an Admin request carries headcount, today's attendance, pending leaves and salaries; an employee request carries only their own attendance, leave and balance (the company-wide fields are not even sent). The model is told to answer only from that JSON, so it can only repeat numbers that really exist.

```js
// js/ai.js — what leaves the browser
{ model: 'openrouter/free',
  messages: [
    { role: 'system', content: 'Answer ONLY from the JSON data below…\n\nDATA:' + JSON.stringify(facts) },
    { role: 'user',   content: question } ],
  max_tokens: 500, temperature: 0.2 }
```

### Turning it on

The key is **never** written into the source — the repository and the GitHub Pages site are public, so a committed key would be readable by anyone. Supply it in either way, and it is stored only in that browser under `hcm_ai_key`:

1. open the site once with `index.html#ai=<your key>` (the key moves into `localStorage` and the hash is scrubbed from the address bar), or
2. paste it into **Settings → AI assistant** and press **Save** (there is a **Test** button there too).

**Remove key** deletes it again. Every browser keeps its own key, so a visitor without one simply gets the local answers.

### When something goes wrong

The local answer is always computed first, so a rejected key, a blocked network or a timeout degrades instead of failing: the helper replies with the local answer and adds *"Switched to local answers — …"*.

Free models occasionally reply with **nothing**, or with a moderation stub such as `User Safety: safe`. Both are detected (`AI.isJunk`) and retried once; if the second attempt is still unusable the local answer is used instead. A blank question never leaves the browser.

Model output is HTML-escaped before it touches the DOM; only `<b>`, `<i>` and `<br>` are let back through.

Examples: *"How many employees do we have?"*, *"Who is on leave today?"*, *"Who was late today?"* (Admin) · *"Was I late today?"*, *"How many hours did I work this week?"*, *"How many leaves do I have left?"* (Employee).

---

## Responsiveness & accessibility

- Tested at **320, 360, 390, 414, 768, 820, 1024, 1280 and 1920 px** — no horizontal overflow on any page at any of those widths.
- Sidebar collapses to a hamburger menu under 900px (and on touch devices); data tables scroll horizontally on phones; safe-area insets and `100dvh` keep content clear of notches and mobile browser chrome.
- Tap targets are at least 44px on coarse pointers; inputs stay at 16px on phones so iOS does not zoom on focus.
- Semantic markup, labelled inputs, visible focus rings, `aria-current` on the active nav item, `aria-pressed` on the theme toggle.
- `prefers-reduced-motion` is respected; the payslip page and the monthly report have print stylesheets.

---

## Verification

- **214 logic assertions** (Node, all `js/*` modules loaded together), 0 failures:
  - **101 sync** — setup/login, employee validation and filters, the late / half-day / absent rules, leave rules and quota, payslip maths, helper scoping, the camera geofence, the camera button gates, the storage-quota fallback, unique ids, the AI layer (key on/off, `#ai=` capture, model default, role-scoped facts, output escaping, junk detection), the CSV builder (escaping, hours, per-working-day rows, filenames) and the monthly report (balanced rows, totals, department rollup, escaping).
  - **113 async** — a stubbed OpenRouter transport: local fallback with no key, bearer header and `X-Title`, admin payload carries company data while the employee payload does not and never contains the key, model HTML is sanitised, HTTP 401 and network failures fall back to the local answer.
- Every `.js` file and every inline `<script>` parses (`vm.Script`), **26 scripts, 0 failures**.
- **63/63 responsive combinations clean** (7 pages × 9 viewports, max overflow 0px).
- **32 browser checks** in headless Edge for the bonus features: charts render and their buckets add up to headcount, the report preview opens/closes with correct totals, the print container is built and the print dialog requested, both CSV downloads produce the right filenames, dark mode flips the DOM/localStorage/ARIA state, recolours the charts and survives navigation, and the employee dashboard has **no** report card or charts.
- Headless Edge smoke tests: all seven pages render, role guards bounce an Employee off admin pages, the camera dialog opens with a live preview (`cam=ok/live`), geolocation resolves, and `face-api.js` loads its weights from the CDN and detects a real face (`score=0.740`).
- **22 browser checks** for the assistant over real HTTP: the key arrives through `#ai=` and is scrubbed from the URL, the key never appears in the DOM, the badge flips `local data` → `AI on`, a live OpenRouter call answers inside the chat, and the employee session gets the same key while its payload stays role-scoped.
- **Live battery of 19 questions** through the real helper (OpenRouter, `openrouter/free`): correct numbers (headcount, 237,000 PKR total, quota 12, start 09:00 + 15 min), refusal of company and third-party salary from an employee session, `0` empty replies, `0` safety-stub replies after the retry, blank input answered locally without a network call.

---

## Deploy

It is a static site — no build step, no install. It is live in three places:

| Where | Link |
|---|---|
| Vercel (primary) | https://letmehire.vercel.app |
| GitHub Pages | https://sheikh-ayyan-iftikhar.github.io/SMIT-Hackathon_Task-/ |
| Repository | https://github.com/Sheikh-Ayyan-Iftikhar/SMIT-Hackathon_Task- |

The Vercel project is connected to the GitHub repository, so pushing to `main` redeploys it. The repository link and the hosted link are submitted on [lms.saylaniit.com](https://lms.saylaniit.com/).

---

## Known limitations

- `localStorage` is per-browser, so records are not shared between devices or users. A real deployment would use a server and a database.
- Passwords are stored in plain text inside `localStorage` because this is a browser-only learning app. Do not reuse a real password.
- The camera face check needs an internet connection the first time (the model comes from a CDN) and needs a device with a camera; when either is missing the dialog reports it and the plain check-in button remains.
- The AI assistant costs tokens on the key owner's OpenRouter account, only works while that browser has a key, and answers are only as good as the model routed by `openrouter/free` — the local keyword layer stays the fallback. Roughly one answer in five needed a retry or fell back locally in testing.
- The charts need one connection to `cdn.jsdelivr.net` (Chart.js); without it the card reports that instead of drawing.
- Each Vercel deployment is a separate copy of the data (`localStorage` is per origin), so the app set up on `letmehire.vercel.app` is not the one on GitHub Pages.
