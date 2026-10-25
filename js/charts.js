/* ============================================================
   charts.js — dashboard charts (Chart.js from CDN)
   Chart A: today's attendance by department (stacked bars)
   Chart B: present / late / absent over the last 14 days
   Colours follow the active theme, so they are rebuilt on
   every dark/light toggle (UI.toggleTheme -> Charts.refresh).
   ============================================================ */

const Charts = {
  _dept: null,
  _trend: null,

  available() { return typeof Chart !== 'undefined'; },

  palette() {
    const cs = getComputedStyle(document.documentElement);
    const v = n => (cs.getPropertyValue(n) || '').trim();
    return {
      ink: v('--ink') || '#0f172a',
      muted: v('--muted') || '#64748b',
      line: v('--line') || '#e6e9ef',
      surface: v('--surface') || '#ffffff',
      brand: v('--brand') || '#0e8c74',
      ok: v('--ok') || '#16a34a',
      warn: v('--warn') || '#d97706',
      info: v('--info') || '#0891b2',
      bad: v('--bad') || '#dc2626'
    };
  },

  /* today: one bucket per department, categories never overlap */
  byDepartment() {
    const company = getCompany() || {};
    const today = todayISO();
    const buckets = {};
    const order = [];

    employees().forEach(u => {
      const k = u.department || 'No department';
      if (!buckets[k]) { buckets[k] = { present: 0, late: 0, half: 0, absent: 0, leave: 0, off: 0 }; order.push(k); }
      const b = buckets[k];
      const rec = attendanceFor(u.id, today);
      if (rec) {
        const st = Attendance.computeStatus(rec, company);
        if (st === 'half-day') b.half++;
        else if (st === 'late') b.late++;
        else b.present++;
      } else if (!isWorkingDay(today, company)) {
        b.off++;
      } else if (getLeaves().some(l => l.userId === u.id && l.status === 'approved' && l.from <= today && l.to >= today)) {
        b.leave++;
      } else {
        b.absent++;
      }
    });

    return {
      labels: order,
      present: order.map(k => buckets[k].present),
      late: order.map(k => buckets[k].late),
      half: order.map(k => buckets[k].half),
      leave: order.map(k => buckets[k].leave),
      absent: order.map(k => buckets[k].absent),
      off: order.map(k => buckets[k].off)
    };
  },

  trend(days) {
    const company = getCompany() || {};
    const n = Number(days) || 14;
    const out = { labels: [], present: [], late: [], absent: [] };
    const emps = employees();

    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      let present = 0, late = 0, absent = 0;
      const working = isWorkingDay(iso, company);

      emps.forEach(u => {
        const rec = attendanceFor(u.id, iso);
        if (rec) {
          const st = Attendance.computeStatus(rec, company);
          if (st === 'late') late++;
          else present++;
        } else if (working && !getLeaves().some(l => l.userId === u.id && l.status === 'approved' && l.from <= iso && l.to >= iso)) {
          absent++;
        }
      });

      out.labels.push(d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }));
      out.present.push(present);
      out.late.push(late);
      out.absent.push(absent);
    }
    return out;
  },

  _base(p) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: p.ink, boxWidth: 11, font: { size: 11 } }, position: 'bottom' },
        tooltip: { bodyColor: p.ink, titleColor: p.ink, backgroundColor: p.surface, borderColor: p.line, borderWidth: 1 }
      },
      animation: { duration: 350 }
    };
  },

  render() {
    if (!Charts.available()) return false;
    const p = Charts.palette();
    const el1 = document.getElementById('chDept');
    const el2 = document.getElementById('chTrend');
    if (!el1 || !el2) return false;

    if (Charts._dept) { Charts._dept.destroy(); Charts._dept = null; }
    if (Charts._trend) { Charts._trend.destroy(); Charts._trend = null; }

    try {
      const dep = Charts.byDepartment();
      Charts._dept = new Chart(el1.getContext('2d'), {
        type: 'bar',
        data: {
          labels: dep.labels,
          datasets: [
            { label: 'Present', data: dep.present, backgroundColor: p.ok, borderRadius: 4 },
            { label: 'Late', data: dep.late, backgroundColor: p.warn, borderRadius: 4 },
            { label: 'Half day', data: dep.half, backgroundColor: p.info, borderRadius: 4 },
            { label: 'On leave', data: dep.leave, backgroundColor: p.muted, borderRadius: 4 },
            { label: 'Absent', data: dep.absent, backgroundColor: p.bad, borderRadius: 4 },
            { label: 'Non-working', data: dep.off, backgroundColor: p.line, borderRadius: 4 }
          ]
        },
        options: Object.assign(Charts._base(p), {
          indexAxis: 'y',
          scales: {
            x: { stacked: true, beginAtZero: true, ticks: { color: p.muted, stepSize: 1, precision: 0 }, grid: { color: p.line } },
            y: { stacked: true, ticks: { color: p.ink }, grid: { display: false } }
          }
        })
      });

      const t = Charts.trend(14);
      Charts._trend = new Chart(el2.getContext('2d'), {
        type: 'line',
        data: {
          labels: t.labels,
          datasets: [
            { label: 'Present', data: t.present, borderColor: p.ok, backgroundColor: p.ok + '22', fill: true, tension: .3, pointRadius: 2 },
            { label: 'Late', data: t.late, borderColor: p.warn, backgroundColor: 'transparent', tension: .3, pointRadius: 2 },
            { label: 'Absent', data: t.absent, borderColor: p.bad, backgroundColor: 'transparent', tension: .3, pointRadius: 2, borderDash: [5, 4] }
          ]
        },
        options: Object.assign(Charts._base(p), {
          scales: {
            x: { ticks: { color: p.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }, grid: { color: p.line } },
            y: { beginAtZero: true, ticks: { color: p.muted, stepSize: 1, precision: 0 }, grid: { color: p.line } }
          }
        })
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  refresh() { return Charts.render(); },

  /* Shown in the card when the CDN could not be reached. */
  fallbackNote() {
    const box = document.getElementById('chartNote');
    if (box) box.innerHTML = '<span class="small muted">Charts need a one-time connection to the Chart.js CDN.</span>';
  }
};
