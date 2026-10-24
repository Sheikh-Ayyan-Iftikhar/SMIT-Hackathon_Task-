/* ============================================================
   camera.js — bonus feature: camera check-in / check-out.

   Uses the three browser APIs called for by the hackathon PDF:
     • getUserMedia()      — live camera preview + photo snapshot
     • navigator.geolocation — lat/lng + accuracy, compared with
                                the office area configured in Settings
     • face-api.js (CDN)   — TinyFaceDetector, loads its model
                                weights from a public CDN

   Everything degrades honestly: if a step cannot run, the step is
   shown as unavailable and the record says so. The plain
   "Quick check-in" button on the dashboard never uses this file.
   ============================================================ */

const Camera = {

  LIB_URL: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
  MODEL_URL: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
  DETECT_MS: 700,

  _s: null,

  /* ---------- public: open the dialog ---------- */
  open(opts) {
    const o = Object.assign({ mode: 'in', userId: null, onDone: null }, opts || {});
    if (Camera._s && Camera._s.open) return;

    const s = Camera._s = {
      open: true, mode: o.mode, userId: o.userId, onDone: o.onDone,
      stream: null, watchId: null, timer: null,
      cam: 'run', geo: 'run', face: 'run',
      lat: null, lng: null, accuracy: null, inside: null,
      detected: false, rect: null,
      company: getCompany() || {}
    };

    const label = o.mode === 'out' ? 'Check out' : 'Check in';
    const back = document.createElement('div');
    back.className = 'modal-back on cam-modal';
    back.id = 'camBack';
    back.innerHTML =
      '<div class="modal-box" role="dialog" aria-modal="true" aria-label="Camera ' + (o.mode === 'out' ? 'check-out' : 'check-in') + '">' +
      '  <div class="modal-hd"><span>Camera ' + (o.mode === 'out' ? 'check-out' : 'check-in') + '</span>' +
      '    <button type="button" data-x aria-label="Close">&times;</button></div>' +
      '  <div class="modal-bd">' +
      '    <div class="cam-stage">' +
      '      <video id="camVideo" playsinline muted autoplay></video>' +
      '      <canvas class="overlay" id="camOverlay"></canvas>' +
      '      <span class="cam-live d-none" id="camLive"><span class="dot"></span>LIVE</span>' +
      '      <div class="cam-hint" id="camHint">Starting the camera&hellip;</div>' +
      '    </div>' +
      '    <ul class="cam-steps" id="camSteps">' +
      '      <li data-step="cam"><span class="st-ico">&middot;</span><span class="st-lbl">Camera</span><span class="st-val">starting&hellip;</span></li>' +
      '      <li data-step="geo"><span class="st-ico">&middot;</span><span class="st-lbl">Location</span><span class="st-val">locating&hellip;</span></li>' +
      '      <li data-step="face"><span class="st-ico">&middot;</span><span class="st-lbl">Face check</span><span class="st-val">loading model&hellip;</span></li>' +
      '    </ul>' +
      '    <p class="cam-note" id="camNote">The photo, coordinates and face result are stored with today&rsquo;s record in this browser only.</p>' +
      '  </div>' +
      '  <div class="modal-ft">' +
      '    <button type="button" class="btn btn-outline" data-x>Cancel</button>' +
      '    <button type="button" class="btn btn-primary" data-go disabled>' + label + '</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(back);
    s.back = back;
    s.video = back.querySelector('#camVideo');
    s.overlay = back.querySelector('#camOverlay');
    s.hint = back.querySelector('#camHint');
    s.live = back.querySelector('#camLive');
    s.go = back.querySelector('[data-go]');
    s.note = back.querySelector('#camNote');

    back.querySelectorAll('[data-x]').forEach(b => { b.onclick = Camera.close; });
    back.addEventListener('click', e => { if (e.target === back) Camera.close(); });
    s.esc = e => { if (e.key === 'Escape') Camera.close(); };
    document.addEventListener('keydown', s.esc);
    s.go.onclick = Camera.confirm;

    Camera._startCamera();
    Camera._startGeo();
    Camera._startFace();
    Camera._hint('Run', 'Checking camera, location and face&hellip;');
    Camera._gate();
  },

  /* ---------- public: tear everything down ---------- */
  close() {
    const s = Camera._s;
    Camera._s = null;
    if (!s) return;
    s.open = false;
    if (s.timer) clearTimeout(s.timer);
    if (s.watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(s.watchId);
    if (s.stream) s.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
    document.removeEventListener('keydown', s.esc);
    if (s.back && s.back.parentNode) s.back.parentNode.removeChild(s.back);
  },

  /* ---------- step 1: camera ---------- */
  _startCamera() {
    const s = Camera._s;
    const set = (state, text) => { s.cam = state; Camera._step('cam', state, text); Camera._gate(); };

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      set('bad', 'not supported');
      Camera._hint('Bad', 'This browser does not expose the camera API.');
      return;
    }
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      set('bad', 'needs https');
      Camera._hint('Bad', 'Camera access needs https:// or localhost.');
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false
    }).then(stream => {
      if (!Camera._s) { stream.getTracks().forEach(t => t.stop()); return; }
      s.stream = stream;
      s.video.srcObject = stream;
      const p = s.video.play();
      if (p && p.catch) p.catch(() => {});
      set('ok', 'live');
      s.live.classList.remove('d-none');
      Camera._hint('Run', 'Sit straight and look at the camera.');
    }).catch(err => {
      const name = (err && err.name) || '';
      set('bad', name === 'NotAllowedError' ? 'permission denied' : 'unavailable');
      Camera._hint('Bad', name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow it in the address bar.'
        : 'No camera available on this device.');
    });
  },

  /* ---------- step 2: geolocation ---------- */
  _startGeo() {
    const s = Camera._s;
    const set = (state, text) => { s.geo = state; Camera._step('geo', state, text); Camera._gate(); };

    if (!navigator.geolocation) { set('bad', 'not supported'); return; }
    s.watchId = navigator.geolocation.watchPosition(pos => {
      if (!Camera._s) return;
      s.lat = pos.coords.latitude;
      s.lng = pos.coords.longitude;
      s.accuracy = Math.round(pos.coords.accuracy);
      s.inside = Camera._inOffice(s.company, s.lat, s.lng);
      const cfg = Camera._office(s.company);
      if (!cfg.set) set('ok', s.lat.toFixed(4) + ', ' + s.lng.toFixed(4));
      else set(s.inside ? 'ok' : 'bad', (s.inside ? 'inside · ' : 'outside · ') + s.accuracy + ' m');
      Camera._gate();
    }, err => {
      set('bad', err && err.code === 1 ? 'permission denied' : 'unavailable');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  },

  /* ---------- step 3: face detection ---------- */
  _startFace() {
    const s = Camera._s;
    const set = (state, text) => { s.face = state; Camera._step('face', state, text); Camera._gate(); };

    const ready = () => {
      if (!Camera._s) return;
      s.modelReady = true;
      Camera._detectLoop();
    };
    const fail = why => {
      if (!Camera._s) return;
      set('bad', why);
      Camera._note('The face model could not be loaded (' + why + '), so <b>face verification is off</b> for this attempt. ' +
        'The camera snapshot and location are still recorded.');
      Camera._gate();
    };

    const boot = () => {
      if (!window.faceapi) return Promise.reject(new Error('script'));
      return Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(Camera.MODEL_URL)
      ]);
    };

    set('run', 'loading model…');
    const start = Date.now();
    const script = window.faceapi ? Promise.resolve() : new Promise((res, rej) => {
      const el = document.createElement('script');
      el.src = Camera.LIB_URL; el.async = true;
      el.onload = () => res();
      el.onerror = () => rej(new Error('script'));
      document.head.appendChild(el);
      setTimeout(() => rej(new Error('timeout')), 20000);
    });

    script.then(boot).then(ready).catch(e => fail((e && e.message) || 'error'));
    setTimeout(() => {
      if (Camera._s && !s.modelReady && s.face === 'run') fail('timeout after ' + Math.round((Date.now() - start) / 1000) + 's');
    }, 25000);
  },

  _detectLoop() {
    const s = Camera._s;
    if (!s || !s.open) return;
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 });

    Promise.resolve()
      .then(() => faceapi.detectSingleFace(s.video, opts))
      .then(det => {
        if (!Camera._s) return;
        if (det) {
          s.detected = true;
          s.rect = det.box;
          if (s.face !== 'ok') { s.face = 'ok'; Camera._step('face', 'ok', 'face detected'); }
          Camera._draw(det.box);
        } else {
          s.detected = false;
          s.rect = null;
          Camera._clearBox();
          if (!s.detected) Camera._step('face', 'run', 'looking for a face…');
        }
        Camera._gate();
      })
      .catch(() => {})
      .then(() => {
        if (!Camera._s || !Camera._s.open) return;
        s.timer = setTimeout(() => Camera._detectLoop(), Camera.DETECT_MS);
      });
  },

  /* ---------- overlay box (mapped through object-fit: cover) ---------- */
  _draw(box) {
    const s = Camera._s;
    const v = s.video, c = s.overlay;
    const cw = c.clientWidth || 320, ch = c.clientHeight || 240;
    if (c.width !== cw) { c.width = cw; c.height = ch; }
    const vw = v.videoWidth || cw, vh = v.videoHeight || ch;
    const scale = Math.max(cw / vw, ch / vh);
    const ox = (cw - vw * scale) / 2, oy = (ch - vh * scale) / 2;

    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);
    const x = ox + box.x * scale, y = oy + box.y * scale;
    const w = box.width * scale, h = box.height * scale;

    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = 'rgba(45,212,191,.16)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2dd4bf';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText('FACE', x, Math.max(12, y - 6));
  },
  _clearBox() {
    const s = Camera._s;
    if (s && s.overlay) {
      const c = s.overlay;
      c.getContext('2d').clearRect(0, 0, c.width, c.height);
    }
  },

  /* ---------- office geofence ---------- */
  _office(co) {
    const set = co && co.officeLat !== '' && co.officeLat != null && co.officeLng !== '' && co.officeLng != null;
    let r = Number(co && co.officeRadius);
    if (!r || r < 0) r = 100;
    return { set: !!set, lat: Number(co && co.officeLat), lng: Number(co && co.officeLng), radius: r, required: !!(co && co.officeRequired) };
  },

  _inOffice(co, lat, lng) {
    const o = Camera._office(co);
    if (!o.set || isNaN(lat) || isNaN(lng)) return null;
    const toR = Math.PI / 180;
    const dLat = (o.lat - lat) * toR, dLng = (o.lng - lng) * toR;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * toR) * Math.cos(o.lat * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const m = 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a)));
    return { yes: m <= o.radius, meters: Math.round(m), radius: o.radius };
  },

  /* ---------- snapshot ---------- */
  _snapshot() {
    const s = Camera._s, v = s && s.video;
    if (!v || !v.videoWidth) return null;
    try {
      const w = 160;
      const h = Math.max(1, Math.round(v.videoHeight * (w / v.videoWidth)));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(v, 0, 0, w, h);
      return cv.toDataURL('image/jpeg', 0.5);
    } catch (e) { return null; }
  },

  /* ---------- UI helpers ---------- */
  _step(key, state, text) {
    const s = Camera._s;
    if (!s || !s.back) return;
    const li = s.back.querySelector('[data-step="' + key + '"]');
    if (!li) return;
    li.className = state === 'ok' ? 'ok' : state === 'bad' ? 'bad' : state === 'run' ? 'run' : '';
    li.querySelector('.st-ico').textContent = state === 'ok' ? '✓' : state === 'bad' ? '!' : state === 'run' ? '…' : '·';
    li.querySelector('.st-val').textContent = text || '';
  },

  _hint(kind, html) {
    const s = Camera._s;
    if (!s || !s.hint) return;
    s.hint.className = 'cam-hint' + (kind === 'Bad' ? ' bad' : kind === 'Ok' ? ' ok' : '');
    s.hint.innerHTML = html;
  },

  _note(html) {
    const s = Camera._s;
    if (s && s.note) s.note.innerHTML = html;
  },

  /* Enable the button only when every required gate passes. */
  _gate() {
    const s = Camera._s;
    if (!s || !s.go) return;
    const o = Camera._office(s.company);

    const cameraOk = s.cam === 'ok';
    const faceOk = s.face === 'ok' || s.face === 'bad';          /* model unavailable = neutral */
    const geoOk = s.geo === 'ok';
    const geoNeeded = o.set && o.required;
    const areaOk = !o.set || !o.required || (s.inside && s.inside.yes);
    const geoOkWhenNeeded = geoOk || !geoNeeded;

    s.go.disabled = !(cameraOk && faceOk && geoOkWhenNeeded && areaOk);

    if (!cameraOk) return;
    if (o.set && o.required && s.geo === 'run') { Camera._hint('Run', 'Waiting for your location…'); return; }
    if (s.face === 'ok') Camera._hint('Ok', 'Face detected &mdash; ready.');
    else if (s.face === 'run') Camera._hint('Run', 'Look at the camera until your face is detected.');
    else Camera._hint('Run', 'Camera ready &mdash; face check skipped.');
    if (o.set && o.required && s.inside && !s.inside.yes) {
      Camera._hint('Bad', 'You are ' + s.inside.meters + ' m from the office (radius ' + s.inside.radius + ' m).');
    }
  },

  /* ---------- confirm ---------- */
  confirm() {
    const s = Camera._s;
    if (!s || s.go.disabled) return;

    const photo = Camera._snapshot();
    const o = Camera._office(s.company);
    const inside = Camera._inOffice(s.company, s.lat, s.lng);

    const meta = {
      source: 'camera',
      at: new Date().toISOString(),
      face: s.face === 'ok' ? 'detected' : 'unavailable',
      geo: s.geo === 'ok'
        ? (o.set ? (inside && inside.yes ? 'inside office area' : 'outside office area') : 'captured')
        : 'not shared'
    };
    if (photo) meta.photo = photo;
    if (s.lat != null) {
      meta.lat = Number(s.lat.toFixed(6));
      meta.lng = Number(s.lng.toFixed(6));
      meta.accuracy = s.accuracy;
      if (o.set && inside) meta.meters = inside.meters;
    }

    Camera.close();

    const res = s.mode === 'out'
      ? Attendance.checkOut(s.userId, meta)
      : Attendance.checkIn(s.userId, meta);

    if (s.onDone) s.onDone(res);
    else UI.toast(res.ok ? res.message : res.error, res.ok ? 'ok' : 'bad');
  }
};
