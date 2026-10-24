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

---

## Pages (7)

| Page | What it does |
|---|---|
| `index.html` | Login + first-run setup (creates the company and the Admin account) |
| `pages/admin.html` | Admin dashboard — totals, today's attendance, pending leaves, announcements, smart helper |
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
js/camera.js           bonus: camera check-in (getUserMedia + geolocation + face-api.js)
js/ui.js               escaping, toasts, modal, responsive shell
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

## Smart helper

A chat box on both dashboards that answers from the app's own data with keyword matching (`text.includes("leave")` style). Employees only ever receive their own records; company-wide questions are refused.

Examples: *"How many employees do we have?"*, *"Who is on leave today?"*, *"Who was late today?"* (Admin) · *"Was I late today?"*, *"How many hours did I work this week?"*, *"How many leaves do I have left?"* (Employee).

The helper never invents a number — if there is no data it says so.

---

## Responsiveness & accessibility

- Sidebar collapses to a hamburger menu under 900px; tables scroll horizontally on phones.
- Semantic markup, labelled inputs, visible focus rings, `aria-current` on the active nav item.
- `prefers-reduced-motion` is respected; the payslip page has a print stylesheet.

---

## Verification

- **62 logic assertions** (Node, the 8 `js/*.` modules loaded together) covering setup/login, employee validation and filters, the late / half-day / absent rules, leave rules and quota, payslip maths, helper scoping, the camera geofence, the camera button gates and the storage-quota fallback — all passing.
- Every `.js` file and every inline `<script>` parses (`vm.Script`), 15 scripts, 0 failures.
- Headless Edge smoke tests: all seven pages render, role guards bounce an Employee off admin pages, the camera dialog opens with a live preview (`cam=ok/live`), geolocation resolves (`geo=ok/…`), and `face-api.js` loads its weights from the CDN and detects a real face (`score=0.740`).

---

## Deploy

Push the folder to GitHub Pages, Netlify or Vercel — it is a static site, so there is nothing to build. The repository link and the hosted link are submitted on [lms.saylaniit.com](https://lms.saylaniit.com/).

---

## Known limitations

- `localStorage` is per-browser, so records are not shared between devices or users. A real deployment would use a server and a database.
- Passwords are stored in plain text inside `localStorage` because this is a browser-only learning app. Do not reuse a real password.
- The camera face check needs an internet connection the first time (the model comes from a CDN) and needs a device with a camera; when either is missing the dialog reports it and the plain check-in button remains.
- Not included: Chart.js dashboard charts, CSV export, a live LLM API for the helper.
