/* ລະບົບຈັດການຫ້ອງສະໝຸດ — ໂຄງສ້າງຂໍ້ມູນຕາມ Library_Management.sql
   Members · Category · Books · Loans · Fines */
(function () {
  'use strict';

  var KEY = 'lao-library-v2';
  var FINE_PER_DAY = 2000;   // ກີບ ຕໍ່ມື້
  var LOAN_DAYS = 7;
  var ST = { OUT: 'ຢືມຢູ່', BACK: 'ສົ່ງແລ້ວ', LATE: 'ເກີນກຳນົດ' };

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var iso = function (d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  var today = function () { return iso(new Date()); };
  var addDays = function (s, n) { var d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  var diffDays = function (a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); };
  var fmt = function (s) { return s ? s.split('-').reverse().join('/') : '—'; };
  var kip = function (n) { return Number(n).toLocaleString('en-US') + ' ກີບ'; };
  var hue = function (n) { return (n * 67 + 150) % 360; };
  var MONTHS = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];
  var DAYS = ['ວັນອາທິດ', 'ວັນຈັນ', 'ວັນອັງຄານ', 'ວັນພຸດ', 'ວັນພະຫັດ', 'ວັນສຸກ', 'ວັນເສົາ'];

  var ICON = {
    dashboard: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z"/>',
    books: '<path d="M5 4h4v16H5zM10.5 4h4v16h-4zM16 6l3.5-1 3 14-3.5 1z" transform="translate(-1.5 0)"/>',
    members: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.900 1.900 6.500 5.500M16 5a3.300 3.300 0 010 6.500M18 14.800c2 .700 3.200 2.400 3.600 5.200"/>',
    loans: '<path d="M4 8h13l-3.500-3.500M20 16H7l3.500 3.500"/>',
    fines: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7v10M14.800 9.300c-.600-.900-1.600-1.300-2.800-1.300-1.600 0-2.800.800-2.800 2s1 1.700 2.800 2 2.800.800 2.800 2-1.200 2-2.800 2c-1.300 0-2.300-.500-2.900-1.400"/>',
    categories: '<path d="M4 5h7l2 2h7v12H4z"/>',
    database: '<ellipse cx="12" cy="6" rx="7.500" ry="3"/><path d="M4.500 6v6c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3V6M4.500 12v6c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3v-6"/>',
    clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>'
  };
  var icon = function (n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>';
  };

  /* ---------- data ---------- */
  function seed() {
    var t = today();
    var db = {
      members: [], categories: [], books: [], loans: [], fines: [],
      seq: { member: 0, category: 0, book: 0, loan: 0, fine: 0 }
    };
    ['ການຂຽນໂປຣແກຣມ', 'ເວັບໄຊ໌ ແລະ ມືຖື', 'ເຄືອຂ່າຍ ແລະ ລະບົບ', 'ການວິເຄາະລະບົບ', 'ການເງິນ - ທະນາຄານ'].forEach(function (n) {
      db.categories.push({ category_id: ++db.seq.category, category_name: n });
    });
    var inst = 'ສະຖາບັນ ເຕັກໂນໂລຊີ ສຸດສະກະ';
    [
      ['ການວິເຄາະ ແລະ ອອກແບບລະບົບ (System Analysis and Design)', 4, 5, 'covers/sad.jpg'],
      ['ການຄຸ້ມຄອງເຄືອຂ່າຍຄອມພິວເຕີແບບວິນໂດ 2 (Windows Server Administration 2)', 3, 3, 'covers/winserver.jpg'],
      ['ການສ້າງເວັບໄຊ໌ 1 (Web Programming 1 - HTML)', 2, 6, 'covers/web.jpg'],
      ['ການສ້າງໂປຣແກຣມຄອມພິວເຕີ 2 (Software Programming 2 - Python)', 1, 4, 'covers/python.jpg'],
      ['ການສ້າງໂປຣແກຣມສຳລັບມືຖື 2 (Mobile Application Programming 2)', 2, 4, 'covers/mobile.jpg'],
      ['ລະບົບປະຕິບັດງານ (Operating System)', 3, 4, 'covers/os.jpg'],
      ['ພາສາຊີ (C Language Programing)', 1, 5, 'covers/c.jpg'],
      ['ການບໍລິຫານສິນເຊື່ອທະນາຄານ (Back Credit Management)', 5, 2, 'covers/credit.jpg']
    ].forEach(function (b) {
      db.books.push({ Book_id: ++db.seq.book, Title: b[0], Author: inst, Category_id: b[1], Total_copies: b[2], Available_copies: b[2], cover: b[3] });
    });
    [
      ['ທ້າວ ບຸນມີ ສີສະຫວາດ', '020 5550 1101', 'ບ້ານ ໂພນທັນ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ', -210],
      ['ນາງ ຈັນທະລາ ພົມມະວົງ', '020 5550 1102', 'ບ້ານ ດົງໂດກ, ເມືອງ ໄຊທານີ, ນະຄອນຫຼວງວຽງຈັນ', -180],
      ['ທ້າວ ຄຳຫຼ້າ ແກ້ວມະນີ', '020 5550 1103', 'ບ້ານ ສີໄຄ, ເມືອງ ສີໂຄດຕະບອງ, ນະຄອນຫຼວງວຽງຈັນ', -150],
      ['ນາງ ມະນີວັນ ໄຊຍະສອນ', '020 5550 1104', 'ບ້ານ ທາດຫຼວງ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ', -121],
      ['ທ້າວ ສຸກສະຫວັນ ອິນທະວົງ', '020 5550 1105', 'ບ້ານ ໂພນສະຫວັນ, ເມືອງ ສີສັດຕະນາກ, ນະຄອນຫຼວງວຽງຈັນ', -90],
      ['ນາງ ດາວັນ ວົງພະຈັນ', '020 5550 1106', 'ບ້ານ ໜອງບອນ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ', -62],
      ['ທ້າວ ພູວົງ ສຸລິຍະ', '020 5550 1107', 'ບ້ານ ໂນນສະຫວ່າງ, ເມືອງ ໄຊທານີ, ນະຄອນຫຼວງວຽງຈັນ', -33],
      ['ນາງ ນ້ອຍ ຫຼວງລາດ', '020 5550 1108', 'ບ້ານ ດອນກອຍ, ເມືອງ ສີສັດຕະນາກ, ນະຄອນຫຼວງວຽງຈັນ', -12]
    ].forEach(function (m) {
      db.members.push({ member_id: ++db.seq.member, Name: m[0], Phone: m[1], Address: m[2], Join_date: addDays(t, m[3]) });
    });
    // [member, book, ມື້ທີ່ຢືມ (ທຽບກັບມື້ນີ້), ມື້ທີ່ສົ່ງຄືນ | null, ຈ່າຍຄ່າປັບໄໝແລ້ວບໍ]
    [
      [3, 8, -20, -10, false], [1, 4, -13, -8], [2, 3, -12, -3, true], [3, 1, -11, null], [4, 7, -10, -6],
      [5, 4, -9, null], [6, 6, -9, -3], [1, 2, -7, null], [7, 5, -5, -1], [2, 4, -5, null],
      [8, 3, -4, null], [4, 1, -3, null], [5, 7, -3, null], [6, 3, -1, null], [1, 6, -1, null], [7, 4, 0, null],
      [5, 3, -13, -9], [6, 1, -13, -7], [8, 7, -12, -8], [7, 6, -12, -6], [4, 5, -12, -7], [2, 6, -10, -5], [8, 5, -10, -4],
      [1, 3, -9, -4], [3, 7, -9, -2], [7, 1, -8, -3], [4, 4, -7, -2], [6, 5, -6, -2], [2, 7, -5, -1], [8, 6, -4, -1], [3, 3, -4, -1],
      [5, 5, -2, null], [2, 1, -2, null], [4, 6, 0, null], [8, 7, 0, null], [3, 2, 0, null]
    ].sort(function (p, q) { return p[2] - q[2]; }).forEach(function (l) {
      var loanDate = addDays(t, l[2]), due = addDays(loanDate, LOAN_DAYS), ret = l[3] == null ? null : addDays(t, l[3]);
      var loan = { Loan_id: ++db.seq.loan, member_id: l[0], Book_id: l[1], Loan_date: loanDate, Due_date: due, Return_date: ret, Status: ret ? ST.BACK : ST.OUT };
      db.loans.push(loan);
      if (!ret) { db.books[l[1] - 1].Available_copies--; }
      if (ret && ret > due) {
        db.fines.push({ Fine_id: ++db.seq.fine, Loan_id: loan.Loan_id, Amount: diffDays(due, ret) * FINE_PER_DAY, Paid: l[4] ? 1 : 0, Paid_date: l[4] ? ret : null });
      }
    });
    return db;
  }

  var db;
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { db = JSON.parse(raw); }
    } catch (e) { db = null; }
    if (!db || !db.books) { db = seed(); }
    refreshStatus();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ເຮັດວຽກຕໍ່ໄດ້ ເຖິງບໍ່ມີບ່ອນເກັບ */ }
  }
  function refreshStatus() {
    var t = today();
    db.loans.forEach(function (l) {
      if (!l.Return_date) { l.Status = t > l.Due_date ? ST.LATE : ST.OUT; }
    });
  }
  var byId = function (list, key, id) { return list.find(function (x) { return x[key] === Number(id); }); };
  var member = function (id) { return byId(db.members, 'member_id', id); };
  var book = function (id) { return byId(db.books, 'Book_id', id); };
  var category = function (id) { return byId(db.categories, 'category_id', id); };
  var catName = function (id) { var c = category(id); return c ? c.category_name : '—'; };

  /* ---------- small UI pieces ---------- */
  function cover(b, cls) {
    if (b && b.cover) { return '<img class="' + (cls || 'cover') + '" src="' + esc(b.cover) + '" alt="ໜ້າປົກ: ' + esc(b.Title) + '" loading="lazy">'; }
    if (cls === 'thumb') { return '<span class="thumb" style="background:hsl(' + hue(b ? b.Category_id : 0) + ' 50% 35%)"></span>'; }
    return '<div class="cover gen" style="--h:' + hue(b.Category_id) + '"><span>' + esc(b.Title) + '</span><small>' + esc(b.Author) + '</small></div>';
  }
  function tt(b) {
    var m = /^(.*?)\s*\((.*)\)\s*$/.exec(b.Title);
    return m ? { main: m[1], sub: m[2] } : { main: b.Title, sub: b.Author };
  }
  function two(a, b) {
    return '<div class="txt"><div class="t clip" title="' + esc(a) + '">' + esc(a) + '</div><div class="s clip" title="' + esc(b) + '">' + esc(b) + '</div></div>';
  }
  function stamp(s) {
    var c = s === ST.BACK ? 'back' : s === ST.LATE ? 'late' : 'out';
    return '<span class="stamp ' + c + '">' + esc(s) + '</span>';
  }
  function avatar(m) {
    var name = m ? m.Name.replace(/^(ທ້າວ|ນາງ)\s*/, '') : '?';
    return '<span class="avatar" style="--h:' + hue(m ? m.member_id : 0) + '">' + esc(Array.from(name)[0] || '?') + '</span>';
  }
  function toast(msg, bad) {
    var el = document.createElement('div');
    el.className = 'toast' + (bad ? ' bad' : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  /* ---------- modal ---------- */
  var modalSubmit = null;
  function openModal(opts) {
    var m = $('#modal');
    m.className = 'modal' + (opts.wide ? ' wide' : '');
    m.innerHTML =
      '<form id="modal-form" novalidate>' +
      '<header><h2 id="modal-title">' + esc(opts.title) + '</h2><button type="button" class="x" data-act="close" aria-label="ປິດ">×</button></header>' +
      '<div class="body">' + opts.body + '<div class="err" id="modal-err" hidden></div></div>' +
      '<footer>' + (opts.footer || '') +
      (opts.submit ? '<button type="button" class="btn" data-act="close">ຍົກເລີກ</button><button type="submit" class="btn ' + (opts.danger ? 'dark' : 'primary') + '">' + esc(opts.submit) + '</button>'
        : '<button type="button" class="btn" data-act="close">ປິດ</button>') +
      '</footer></form>';
    modalSubmit = opts.onSubmit || null;
    $('#overlay').hidden = false;
    var first = m.querySelector('input:not([type=hidden]), select, textarea');
    (first || m.querySelector('.x')).focus();
    if (opts.onOpen) { opts.onOpen(m); }
  }
  function closeModal() { $('#overlay').hidden = true; $('#modal').innerHTML = ''; modalSubmit = null; }
  function fail(msg) { var e = $('#modal-err'); e.textContent = msg; e.hidden = false; return false; }
  function confirmBox(title, text, label, fn) {
    openModal({ title: title, body: '<p>' + text + '</p>', submit: label, danger: true, onSubmit: function () { fn(); return true; } });
  }
  var val = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
  function field(id, label, sql, input) {
    return '<div class="field"><label for="' + id + '">' + label + (/^[A-Za-z_]+$/.test(sql) ? '' : '<small>' + sql + '</small>') + '</label>' + input + '</div>';
  }

  /* ---------- navigation ---------- */
  var ROUTES = [
    ['dashboard', 'ພາບລວມ'], ['books', 'ປຶ້ມ'], ['members', 'ສະມາຊິກ'], ['loans', 'ຢືມ - ຄືນ'],
    ['fines', 'ຄ່າປັບໄໝ'], ['categories', 'ໝວດໝູ່']
  ];
  var ui = { q: '', cat: 0, loanFilter: 'all', fineFilter: 'all' };
  function route() {
    var r = location.hash.replace('#', '');
    return ROUTES.some(function (x) { return x[0] === r; }) ? r : 'dashboard';
  }
  function renderNav() {
    var r = route();
    var late = db.loans.filter(function (l) { return l.Status === ST.LATE; }).length;
    var unpaid = db.fines.filter(function (f) { return !f.Paid; }).length;
    $('#nav').innerHTML = ROUTES.map(function (x) {
      var n = x[0] === 'loans' ? late : x[0] === 'fines' ? unpaid : 0;
      return '<a href="#' + x[0] + '" class="' + (x[0] === r ? 'on' : '') + '"' + (x[0] === r ? ' aria-current="page"' : '') + '>' +
        icon(x[0]) + '<span>' + x[1] + '</span>' + (n ? '<span class="count num">' + n + '</span>' : '') + '</a>';
    }).join('');
  }
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function renderTop() {
    var r = route(), d = new Date();
    var late = db.loans.filter(function (l) { return l.Status === ST.LATE; }).length;
    $('#crumb').textContent = ROUTES.filter(function (x) { return x[0] === r; })[0][1];
    $('#top-date').textContent = DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    var bell = $('#bell-count'); bell.textContent = late; bell.hidden = !late;
    $('#bell').classList.toggle('ring', late > 0);
    $('#bell').title = late ? 'ມີ ' + late + ' ລາຍການເກີນກຳນົດ' : 'ບໍ່ມີລາຍການເກີນກຳນົດ';
    tick();
  }
  function tick() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    $('#clock').textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function countUp(root) {
    root.querySelectorAll('.tile strong, .cat2-stats b, .strip b.num, .hero-stats b').forEach(function (el) {
      var raw = el.textContent, end = Number(raw.replace(/,/g, ''));
      if (!isFinite(end) || end <= 0) { return; }
      var comma = raw.indexOf(',') > -1, t0 = null;
      var step = function (t) {
        if (t0 === null) { t0 = t; }
        var k = Math.min(1, (t - t0) / 800), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        el.textContent = comma ? v.toLocaleString('en-US') : v;
        if (k < 1) { requestAnimationFrame(step); } else { el.textContent = raw; }
      };
      requestAnimationFrame(step);
    });
  }
  function render(anim) {
    refreshStatus();
    renderNav();
    renderTop();
    var v = $('#view');
    v.classList.remove('enter');
    v.innerHTML = VIEWS[route()]();
    if (anim && !REDUCED) { void v.offsetWidth; v.classList.add('enter'); countUp(v); }
  }
  function commit(msg) { save(); render(); if (msg) { toast(msg); } }

  /* ---------- views ---------- */
  var VIEWS = {};

  function areaChart(days, a, b) {
    var W = 640, H = 250, L = 30, R = 14, T = 40, B = 30, n = days.length, t = days[n - 1];
    var max = Math.ceil(Math.max.apply(null, a.concat(b, [4])) / 4) * 4;
    var x = function (i) { return L + i * (W - L - R) / (n - 1); };
    var y = function (v) { return T + (1 - v / max) * (H - T - B); };
    var line = function (v) {
      var d = 'M' + x(0) + ',' + y(v[0]);
      for (var i = 1; i < n; i++) { var mx = (x(i - 1) + x(i)) / 2; d += ' C' + mx + ',' + y(v[i - 1]) + ' ' + mx + ',' + y(v[i]) + ' ' + x(i) + ',' + y(v[i]); }
      return d;
    };
    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var gv = max / 4 * g;
      grid += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(gv) + '" y2="' + y(gv) + '"/><text class="ax" x="' + (L - 8) + '" y="' + (y(gv) + 4) + '" text-anchor="end">' + gv + '</text>';
    }
    var pts = '', step = (W - L - R) / (n - 1);
    days.forEach(function (dte, i) {
      var lab = Number(dte.slice(8)) + '/' + Number(dte.slice(5, 7));
      if ((n - 1 - i) % 2 === 0) { grid += '<text class="ax' + (dte === t ? ' now' : '') + '" x="' + x(i) + '" y="' + (H - 9) + '" text-anchor="middle">' + (dte === t ? 'ມື້ນີ້' : lab) + '</text>'; }
      var tx = Math.min(Math.max(x(i) - 78, L), W - R - 156);
      pts += '<g class="pt"><rect x="' + (x(i) - step / 2) + '" y="' + T + '" width="' + step + '" height="' + (H - T - B) + '" fill="transparent"/>' +
        '<g class="hv"><line class="guide" x1="' + x(i) + '" x2="' + x(i) + '" y1="' + T + '" y2="' + (H - B) + '"/>' +
        '<circle class="d2" cx="' + x(i) + '" cy="' + y(b[i]) + '" r="4.500"/><circle class="d1" cx="' + x(i) + '" cy="' + y(a[i]) + '" r="5.500"/>' +
        '<rect class="tip" x="' + tx + '" y="4" width="156" height="26" rx="8"/><text class="tiptx" x="' + (tx + 78) + '" y="22" text-anchor="middle">' + lab + ' · ຢືມ ' + a[i] + ' · ຄືນ ' + b[i] + '</text></g></g>';
    });
    var la = line(a);
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="ຈຳນວນການຢືມ ແລະ ການຄືນ 14 ມື້ຜ່ານມາ">' +
      '<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>' +
      grid + '<path class="area" d="' + la + ' L' + x(n - 1) + ',' + y(0) + ' L' + x(0) + ',' + y(0) + ' Z"/>' +
      '<path class="l2" d="' + line(b) + '"/><path class="l1" pathLength="1" d="' + la + '"/>' +
      '<circle class="end" cx="' + x(n - 1) + '" cy="' + y(a[n - 1]) + '" r="5.500"/>' + pts + '</svg>';
  }

  function donut(parts, total, label) {
    var r = 54, c = 2 * Math.PI * r, off = 0, segs = '';
    parts.forEach(function (p) {
      var len = total ? p[1] / total * c : 0;
      if (len > 0) { segs += '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + p[2] + '" stroke-width="16" stroke-dasharray="' + Math.max(0, len - 3) + ' ' + (c - Math.max(0, len - 3)) + '" stroke-dashoffset="' + (-off) + '" stroke-linecap="round"/>'; }
      off += len;
    });
    return '<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="' + label + '"><circle cx="70" cy="70" r="' + r + '" fill="none" class="ring" stroke-width="16"/>' +
      '<g transform="rotate(-90 70 70)">' + segs + '</g><text x="70" y="68" text-anchor="middle" class="big">' + total + '</text><text x="70" y="88" text-anchor="middle" class="ax">ຫົວ</text></svg>' +
      '<div class="legend">' + parts.map(function (p) {
        return '<div><i style="background:' + p[2] + '"></i><span>' + p[0] + '</span><b class="num">' + p[1] + '</b><em class="num">' + (total ? Math.round(p[1] / total * 100) : 0) + '%</em></div>';
      }).join('') + '</div></div>';
  }

  VIEWS.dashboard = function () {
    var t = today(), d = new Date();
    var copies = db.books.reduce(function (s, b) { return s + b.Total_copies; }, 0);
    var out = db.loans.filter(function (l) { return !l.Return_date; });
    var late = out.filter(function (l) { return l.Status === ST.LATE; });
    var unpaid = db.fines.filter(function (f) { return !f.Paid; });
    var unpaidSum = unpaid.reduce(function (s, f) { return s + f.Amount; }, 0);
    var days = [];
    for (var i = 13; i >= 0; i--) { days.push(addDays(t, -i)); }
    var a = days.map(function (x) { return db.loans.filter(function (l) { return l.Loan_date === x; }).length; });
    var b = days.map(function (x) { return db.loans.filter(function (l) { return l.Return_date === x; }).length; });
    var sum = function (v) { return v.reduce(function (s, n) { return s + n; }, 0); };

    var attention = out.filter(function (l) { return diffDays(t, l.Due_date) <= 2; })
      .sort(function (p, q) { return p.Due_date < q.Due_date ? -1 : 1; });
    var attRows = attention.slice(0, 6).map(function (l) {
      var left = diffDays(t, l.Due_date), bk = book(l.Book_id), m = member(l.member_id);
      var tag = left < 0 ? '<span class="pill bad">ເກີນ ' + (-left) + ' ມື້</span>' : left === 0 ? '<span class="pill warn">ຮອດກຳນົດມື້ນີ້</span>' : '<span class="pill teal">ອີກ ' + left + ' ມື້</span>';
      return '<div class="row">' + cover(bk, 'thumb') + '<div class="grow"><div class="t">' + esc(m ? m.Name : '—') + '</div><div class="s">' + esc(bk ? tt(bk).main : '—') + '</div></div>' +
        tag + '<button class="btn sm" data-act="return" data-id="' + l.Loan_id + '">ຮັບຄືນ</button></div>';
    }).join('') || '<div class="empty">ບໍ່ມີປຶ້ມທີ່ໃກ້ຮອດກຳນົດ ຫຼື ເກີນກຳນົດ</div>';

    var pop = db.books.map(function (bk) {
      return { b: bk, n: db.loans.filter(function (l) { return l.Book_id === bk.Book_id; }).length };
    }).sort(function (p, q) { return q.n - p.n; }).slice(0, 5);
    var popMax = Math.max(1, pop.length ? pop[0].n : 1);
    var popRows = pop.map(function (p, i) {
      return '<div class="row"><span class="rank num">' + (i + 1) + '</span>' + cover(p.b, 'thumb') + '<div class="grow"><div class="t">' + esc(tt(p.b).main) + '</div><div class="meter"><i style="width:' + (p.n / popMax * 100) + '%"></i></div></div><span class="num s">' + p.n + ' ຄັ້ງ</span></div>';
    }).join('') || '<div class="empty">ຍັງບໍ່ມີຂໍ້ມູນ</div>';

    var tile = function (cls, ic, label, value, sub) {
      return '<div class="tile ' + cls + '"><span class="ic">' + icon(ic) + '</span><span>' + label + '</span><strong>' + value + '</strong><small>' + sub + '</small></div>';
    };
    return '<section class="hero"><span class="spark"></span><span class="spark"></span><span class="spark"></span><span class="spark"></span><span class="spark"></span><span class="spark"></span><div class="hero-text"><p>' + DAYS[d.getDay()] + ' ທີ ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + '</p><h1>ສະບາຍດີ, ບັນນາລັກ</h1>' +
      '<div class="hero-stats"><span>ຢືມມື້ນີ້ <b class="num">' + a[13] + '</b></span><span>ຄືນມື້ນີ້ <b class="num">' + b[13] + '</b></span><span>ຕ້ອງຕິດຕາມ <b class="num">' + attention.length + '</b></span></div>' +
      '<div class="head-actions"><button class="btn primary" data-act="borrow">' + icon('loans') + 'ຢືມປຶ້ມ</button><button class="btn glass" data-act="add-member">' + icon('plus') + 'ເພີ່ມສະມາຊິກ</button><button class="btn glass" data-act="add-book">' + icon('plus') + 'ເພີ່ມປຶ້ມ</button></div></div>' +
      '<img class="hero-logo" src="logo.png" alt="Library Management System"></section>' +
      '<div class="tiles">' +
      tile('ink', 'books', 'ປຶ້ມທັງໝົດ', copies, db.books.length + ' ຫົວເລື່ອງ') +
      tile('', 'members', 'ສະມາຊິກ', db.members.length, 'ຄົນ') +
      tile('gold', 'loans', 'ກຳລັງຢືມຢູ່', out.length, 'ຫົວ') +
      tile(late.length ? 'alert' : '', 'clock', 'ເກີນກຳນົດ', late.length, 'ລາຍການ') +
      tile(unpaid.length ? 'alert' : '', 'fines', 'ຄ່າປັບໄໝຄ້າງຈ່າຍ', unpaidSum.toLocaleString('en-US'), 'ກີບ · ' + unpaid.length + ' ລາຍການ') +
      '</div>' +
      '<div class="grid2">' +
      '<section class="card"><div class="card-head"><h2>ການຢືມ - ຄືນ 14 ມື້ຜ່ານມາ</h2><div class="keys"><span><i class="k1"></i>ຢືມ <b class="num">' + sum(a) + '</b></span><span><i class="k2"></i>ຄືນ <b class="num">' + sum(b) + '</b></span></div></div>' + areaChart(days, a, b) + '</section>' +
      '<section class="card"><div class="card-head"><h2>ສະຖານະປຶ້ມ</h2><a href="#books">ຊັ້ນປຶ້ມ</a></div>' +
      donut([['ຢູ່ໃນຊັ້ນ', copies - out.length, 'var(--teal)'], ['ຢືມຢູ່', out.length - late.length, 'var(--accent)'], ['ເກີນກຳນົດ', late.length, 'var(--bad)']], copies, 'ສະຖານະປຶ້ມ') + '</section>' +
      '</div>' +
      '<div class="grid2 even">' +
      '<section class="card"><div class="card-head"><h2>ຕ້ອງຕິດຕາມ</h2><a href="#loans">ເບິ່ງທັງໝົດ</a></div><div class="rows">' + attRows + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>ປຶ້ມຍອດນິຍົມ</h2><a href="#books">ເບິ່ງທັງໝົດ</a></div><div class="rows">' + popRows + '</div></section>' +
      '</div>';
  };

  function searchBox(ph) {
    return '<div class="search">' + icon('search') + '<input id="q" type="search" placeholder="' + ph + '" value="' + esc(ui.q) + '" aria-label="' + ph + '"></div>';
  }
  var match = function () {
    var q = ui.q.toLowerCase(), args = arguments;
    if (!q) { return true; }
    for (var i = 0; i < args.length; i++) { if (String(args[i] || '').toLowerCase().indexOf(q) > -1) { return true; } }
    return false;
  };

  VIEWS.books = function () {
    var list = db.books.filter(function (b) {
      return (!ui.cat || b.Category_id === ui.cat) && match(b.Title, b.Author, catName(b.Category_id));
    });
    var chips = '<button class="chip' + (!ui.cat ? ' on' : '') + '" data-act="cat" data-id="0">ທັງໝົດ<b class="num">' + db.books.length + '</b></button>' +
      db.categories.map(function (c) {
        var n = db.books.filter(function (b) { return b.Category_id === c.category_id; }).length;
        return '<button class="chip' + (ui.cat === c.category_id ? ' on' : '') + '" data-act="cat" data-id="' + c.category_id + '">' + esc(c.category_name) + '<b class="num">' + n + '</b></button>';
      }).join('');
    var shelf = list.map(function (b) {
      var badge = b.Available_copies > 0 ? '<span class="pill ok badge num">ຍັງ ' + b.Available_copies + '/' + b.Total_copies + '</span>' : '<span class="pill bad badge">ໝົດແລ້ວ</span>';
      return '<button class="book" data-act="book" data-id="' + b.Book_id + '"><div class="stand">' + cover(b) + badge + '</div>' +
        '<div class="meta" title="' + esc(b.Title) + '"><div class="t clip">' + esc(tt(b).main) + '</div><div class="s clip">' + esc(tt(b).sub) + '</div><span class="tag clip">' + esc(catName(b.Category_id)) + '</span></div></button>';
    }).join('');
    return '<div class="head"><div><h1>ຊັ້ນປຶ້ມ</h1><p>ກົດທີ່ປຶ້ມເພື່ອເບິ່ງລາຍລະອຽດ, ຢືມ ຫຼື ແກ້ໄຂ</p></div>' +
      '<div class="head-actions"><button class="btn primary" data-act="add-book">' + icon('plus') + 'ເພີ່ມປຶ້ມ</button></div></div>' +
      '<div class="toolbar">' + searchBox('ຄົ້ນຫາຊື່ປຶ້ມ ຫຼື ຜູ້ແຕ່ງ') + '</div><div class="chips">' + chips + '</div>' +
      (shelf ? '<div class="shelf">' + shelf + '</div>' : '<div class="card empty">ບໍ່ພົບປຶ້ມທີ່ຄົ້ນຫາ</div>');
  };

  VIEWS.members = function () {
    var rows = db.members.filter(function (m) { return match(m.Name, m.Phone, m.Address); }).map(function (m) {
      var out = db.loans.filter(function (l) { return l.member_id === m.member_id && !l.Return_date; });
      var late = out.some(function (l) { return l.Status === ST.LATE; });
      return '<tr><td class="id">#' + m.member_id + '</td><td><div class="cell">' + avatar(m) + two(m.Name, m.Address) + '</div></td>' +
        '<td class="num">' + esc(m.Phone) + '</td><td class="num">' + fmt(m.Join_date) + '</td>' +
        '<td>' + (out.length ? '<span class="pill ' + (late ? 'bad' : 'teal') + ' num">' + out.length + ' ຫົວ</span>' : '<span class="s">—</span>') + '</td>' +
        '<td><div class="acts"><button class="btn sm" data-act="member" data-id="' + m.member_id + '">ປະຫວັດ</button><button class="btn sm" data-act="edit-member" data-id="' + m.member_id + '">ແກ້ໄຂ</button><button class="btn sm danger" data-act="del-member" data-id="' + m.member_id + '">ລຶບ</button></div></td></tr>';
    }).join('');
    return '<div class="head"><div><h1>ສະມາຊິກ</h1><p>ທັງໝົດ <span class="num">' + db.members.length + '</span> ຄົນ</p></div>' +
      '<div class="head-actions"><button class="btn primary" data-act="add-member">' + icon('plus') + 'ເພີ່ມສະມາຊິກ</button></div></div>' +
      '<div class="toolbar">' + searchBox('ຄົ້ນຫາຊື່, ເບີໂທ ຫຼື ທີ່ຢູ່') + '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>ລະຫັດ</th><th>ຊື່ ແລະ ທີ່ຢູ່</th><th>ເບີໂທ</th><th>ວັນສະໝັກ</th><th>ກຳລັງຢືມ</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="6" class="empty">ບໍ່ພົບສະມາຊິກ</td></tr>') + '</tbody></table></div>';
  };

  VIEWS.loans = function () {
    var f = ui.loanFilter;
    var cnt = function (s) { return db.loans.filter(function (l) { return l.Status === s; }).length; };
    var chip = function (k, label, n) { return '<button class="chip' + (f === k ? ' on' : '') + '" data-act="loan-filter" data-id="' + k + '">' + label + '<b class="num">' + n + '</b></button>'; };
    var rows = db.loans.slice().reverse().filter(function (l) {
      var b = book(l.Book_id), m = member(l.member_id);
      return (f === 'all' || l.Status === f) && match(b && b.Title, m && m.Name, '#' + l.Loan_id);
    }).map(function (l) {
      var b = book(l.Book_id), m = member(l.member_id);
      var lateDays = !l.Return_date && l.Status === ST.LATE ? diffDays(l.Due_date, today()) : 0;
      return '<tr><td class="id">#' + l.Loan_id + '</td><td><div class="cell">' + cover(b, 'thumb') + two(b ? b.Title : '—', m ? m.Name : '—') + '</div></td>' +
        '<td class="num">' + fmt(l.Loan_date) + '</td><td class="num">' + fmt(l.Due_date) + (lateDays ? '<div class="s" style="color:var(--bad)">ເກີນ ' + lateDays + ' ມື້</div>' : '') + '</td><td class="num">' + fmt(l.Return_date) + '</td>' +
        '<td>' + stamp(l.Status) + '</td><td><div class="acts">' + (l.Return_date ? '' : '<button class="btn sm primary" data-act="return" data-id="' + l.Loan_id + '">ຮັບຄືນ</button>') + '</div></td></tr>';
    }).join('');
    return '<div class="head"><div><h1>ການຢືມ - ຄືນ</h1><p>ກຳນົດຢືມ ' + LOAN_DAYS + ' ມື້ · ສົ່ງຊ້າປັບໄໝ ' + kip(FINE_PER_DAY) + ' ຕໍ່ມື້</p></div>' +
      '<div class="head-actions"><button class="btn primary" data-act="borrow">' + icon('plus') + 'ຢືມປຶ້ມ</button></div></div>' +
      '<div class="toolbar">' + searchBox('ຄົ້ນຫາຊື່ປຶ້ມ ຫຼື ຊື່ຜູ້ຢືມ') + '</div>' +
      '<div class="chips">' + chip('all', 'ທັງໝົດ', db.loans.length) + chip(ST.OUT, ST.OUT, cnt(ST.OUT)) + chip(ST.LATE, ST.LATE, cnt(ST.LATE)) + chip(ST.BACK, ST.BACK, cnt(ST.BACK)) + '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>ລະຫັດ</th><th>ປຶ້ມ ແລະ ຜູ້ຢືມ</th><th>ວັນຢືມ</th><th>ວັນກຳນົດສົ່ງ</th><th>ວັນສົ່ງຄືນ</th><th>ສະຖານະ</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7" class="empty">ບໍ່ມີລາຍການ</td></tr>') + '</tbody></table></div>';
  };

  VIEWS.fines = function () {
    var f = ui.fineFilter;
    var sum = function (paid) { return db.fines.filter(function (x) { return !!x.Paid === paid; }).reduce(function (s, x) { return s + x.Amount; }, 0); };
    var chip = function (k, label) { return '<button class="chip' + (f === k ? ' on' : '') + '" data-act="fine-filter" data-id="' + k + '">' + label + '</button>'; };
    var rows = db.fines.slice().reverse().filter(function (x) { return f === 'all' || (f === 'paid') === !!x.Paid; }).map(function (x) {
      var l = byId(db.loans, 'Loan_id', x.Loan_id) || {}, b = book(l.Book_id), m = member(l.member_id);
      var late = l.Return_date ? diffDays(l.Due_date, l.Return_date) : 0;
      return '<tr><td class="id">#' + x.Fine_id + '</td><td class="id">#' + x.Loan_id + '</td><td>' + two(m ? m.Name : '—', (b ? tt(b).main : '—') + ' · ສົ່ງຊ້າ ' + late + ' ມື້') + '</td>' +
        '<td class="r num"><strong>' + kip(x.Amount) + '</strong></td><td>' + (x.Paid ? '<span class="pill ok">ຈ່າຍແລ້ວ</span>' : '<span class="pill bad">ຍັງບໍ່ຈ່າຍ</span>') + '</td><td class="num">' + fmt(x.Paid_date) + '</td>' +
        '<td><div class="acts">' + (x.Paid ? '' : '<button class="btn sm primary" data-act="pay" data-id="' + x.Fine_id + '">ຮັບເງິນ</button>') + '</div></td></tr>';
    }).join('');
    return '<div class="head"><div><h1>ຄ່າປັບໄໝ</h1><p>ລະບົບຄິດຄ່າປັບໄໝໃຫ້ເອງ ເມື່ອຮັບປຶ້ມຄືນຊ້າກວ່າກຳນົດ</p></div></div>' +
      '<div class="tiles"><div class="tile alert"><span>ຄ້າງຈ່າຍ</span><strong>' + sum(false).toLocaleString('en-US') + '</strong><small>ກີບ</small></div>' +
      '<div class="tile" style="--tone:var(--ok)"><span>ເກັບໄດ້ແລ້ວ</span><strong>' + sum(true).toLocaleString('en-US') + '</strong><small>ກີບ</small></div>' +
      '<div class="tile ink"><span>ຈຳນວນລາຍການ</span><strong>' + db.fines.length + '</strong><small>ລາຍການ</small></div></div>' +
      '<div class="chips">' + chip('all', 'ທັງໝົດ') + chip('unpaid', 'ຍັງບໍ່ຈ່າຍ') + chip('paid', 'ຈ່າຍແລ້ວ') + '</div>' +
      '<div class="table-wrap"><table><thead><tr><th>ລະຫັດ</th><th>ການຢືມ</th><th>ສະມາຊິກ ແລະ ປຶ້ມ</th><th class="r">ຈຳນວນເງິນ</th><th>ສະຖານະ</th><th>ວັນຈ່າຍ</th><th></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7" class="empty">ບໍ່ມີຄ່າປັບໄໝ</td></tr>') + '</tbody></table></div>';
  };

  VIEWS.categories = function () {
    var info = db.categories.map(function (c) {
      var bs = db.books.filter(function (b) { return b.Category_id === c.category_id; });
      var copies = bs.reduce(function (s, b) { return s + b.Total_copies; }, 0);
      var out = bs.reduce(function (s, b) { return s + b.Total_copies - b.Available_copies; }, 0);
      return { c: c, bs: bs, copies: copies, out: out };
    });
    var top = info.slice().sort(function (a, b) { return b.copies - a.copies; })[0];
    var titles = db.books.length, copiesAll = info.reduce(function (s, x) { return s + x.copies; }, 0);
    var cards = info.map(function (x, i) {
      var c = x.c, pct = x.copies ? Math.round(x.out / x.copies * 100) : 0;
      var fan = x.bs.slice(0, 3).map(function (b) { return cover(b, 'thumb'); }).join('') || '<span class="fan-empty">' + icon('categories') + '</span>';
      return '<article class="cat2" style="--h:' + hue(c.category_id) + '"><div class="cat2-top"><span class="cat2-no num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div class="fan n' + Math.min(3, x.bs.length) + '">' + fan + '</div></div>' +
        '<div class="cat2-body"><h3 title="' + esc(c.category_name) + '">' + esc(c.category_name) + '</h3>' +
        '<div class="cat2-stats"><div><b class="num">' + x.bs.length + '</b><span>ຫົວເລື່ອງ</span></div><div><b class="num">' + x.copies + '</b><span>ຫົວ</span></div><div><b class="num">' + x.out + '</b><span>ຢືມຢູ່</span></div></div>' +
        '<div class="cat2-meter"><div class="meter"><i style="width:' + pct + '%"></i></div><small class="num">ຖືກຢືມ ' + pct + '%</small></div>' +
        '<div class="acts"><button class="btn sm dark" data-act="cat-go" data-id="' + c.category_id + '">ເບິ່ງປຶ້ມ</button><button class="btn sm" data-act="edit-cat" data-id="' + c.category_id + '">ປ່ຽນຊື່</button><button class="btn sm danger" data-act="del-cat" data-id="' + c.category_id + '">ລຶບ</button></div></div></article>';
    }).join('');
    return '<div class="head"><div><h1>ໝວດໝູ່</h1><p>ຈັດກຸ່ມປຶ້ມຕາມເນື້ອຫາ. ຊື່ໝວດໝູ່ຫ້າມຊ້ຳກັນ</p></div>' +
      '<div class="head-actions"><button class="btn primary" data-act="add-cat">' + icon('plus') + 'ເພີ່ມໝວດໝູ່</button></div></div>' +
      '<div class="strip"><div><span class="ic">' + icon('categories') + '</span><p>ໝວດໝູ່ທັງໝົດ</p><b class="num">' + db.categories.length + '</b></div>' +
      '<div><span class="ic">' + icon('books') + '</span><p>ຫົວເລື່ອງ</p><b class="num">' + titles + '</b></div>' +
      '<div><span class="ic">' + icon('dashboard') + '</span><p>ຈຳນວນປຶ້ມ</p><b class="num">' + copiesAll + '</b></div>' +
      '<div class="wide"><span class="ic">' + icon('fines') + '</span><p>ໝວດທີ່ມີປຶ້ມຫຼາຍທີ່ສຸດ</p><b class="clip">' + esc(top ? top.c.category_name : '—') + '</b></div></div>' +
      '<div class="cats2">' + cards + '<button class="cat-add" data-act="add-cat"><span>' + icon('plus') + '</span>ເພີ່ມໝວດໝູ່ໃໝ່</button></div>';
  };

  /* ---------- forms & actions ---------- */
  var pendingCover = null;

  function bookForm(id) {
    var b = id ? book(id) : null;
    pendingCover = b ? b.cover : null;
    if (!db.categories.length) { toast('ກະລຸນາເພີ່ມໝວດໝູ່ກ່ອນ', true); return; }
    var opts = db.categories.map(function (c) { return '<option value="' + c.category_id + '"' + (b && b.Category_id === c.category_id ? ' selected' : '') + '>' + esc(c.category_name) + '</option>'; }).join('');
    openModal({
      title: b ? 'ແກ້ໄຂປຶ້ມ' : 'ເພີ່ມປຶ້ມໃໝ່', submit: 'ບັນທຶກ',
      body: field('f-title', 'ຊື່ປຶ້ມ', 'Title', '<input id="f-title" maxlength="200" value="' + esc(b ? b.Title : '') + '">') +
        field('f-author', 'ຜູ້ແຕ່ງ', 'Author', '<input id="f-author" maxlength="100" value="' + esc(b ? b.Author : '') + '">') +
        '<div class="two">' + field('f-cat', 'ໝວດໝູ່', 'Category_id', '<select id="f-cat">' + opts + '</select>') +
        field('f-total', 'ຈຳນວນທັງໝົດ', 'Total_copies', '<input id="f-total" type="number" min="1" max="999" value="' + (b ? b.Total_copies : 1) + '">') + '</div>' +
        field('f-cover', 'ຮູບໜ້າປົກ', 'ບໍ່ບັງຄັບ', '<input id="f-cover" type="file" accept="image/*">'),
      onSubmit: function () {
        var title = val('f-title'), author = val('f-author'), total = parseInt(val('f-total'), 10), cat = Number(val('f-cat'));
        if (!title) { return fail('ກະລຸນາປ້ອນຊື່ປຶ້ມ'); }
        if (!author) { return fail('ກະລຸນາປ້ອນຊື່ຜູ້ແຕ່ງ'); }
        if (!(total >= 1)) { return fail('ຈຳນວນທັງໝົດຕ້ອງເປັນ 1 ຂຶ້ນໄປ'); }
        if (b) {
          var out = b.Total_copies - b.Available_copies;
          if (total < out) { return fail('ມີ ' + out + ' ຫົວ ກຳລັງຖືກຢືມຢູ່. ຈຳນວນທັງໝົດຕ້ອງບໍ່ໜ້ອຍກວ່ານີ້'); }
          b.Title = title; b.Author = author; b.Category_id = cat; b.Total_copies = total; b.Available_copies = total - out; b.cover = pendingCover;
        } else {
          db.books.push({ Book_id: ++db.seq.book, Title: title, Author: author, Category_id: cat, Total_copies: total, Available_copies: total, cover: pendingCover });
        }
        commit('ບັນທຶກປຶ້ມສຳເລັດ'); return true;
      }
    });
  }

  function readCover(file) {
    if (!file) { return; }
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var w = 320, h = Math.round(w * 7 / 5), c = document.createElement('canvas');
      c.width = w; c.height = h;
      var s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
      c.getContext('2d').drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      pendingCover = c.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { toast('ອ່ານໄຟລ໌ຮູບບໍ່ໄດ້. ກະລຸນາເລືອກໄຟລ໌ JPG ຫຼື PNG', true); };
    img.src = url;
  }

  function bookDetail(id) {
    var b = book(id); if (!b) { return; }
    var hist = db.loans.filter(function (l) { return l.Book_id === b.Book_id; }).slice(-6).reverse();
    var lines = hist.map(function (l) {
      var m = member(l.member_id);
      return '<div class="ln"><span>' + fmt(l.Due_date) + '</span><span>' + esc(m ? m.Name : '—') + '</span>' + stamp(l.Status) + '</div>';
    }).join('') || '<div class="ln"><span></span><span>ຍັງບໍ່ເຄີຍຖືກຢືມ</span><span></span></div>';
    openModal({
      title: 'ລາຍລະອຽດປຶ້ມ', wide: true,
      body: '<div class="detail"><div>' + cover(b) + '</div><div><h3 style="font-size:19px">' + esc(tt(b).main) + '</h3><p style="color:var(--muted)">' + esc(tt(b).sub) + '</p>' +
        '<dl class="facts"><dt>ລະຫັດປຶ້ມ</dt><dd class="num">#' + b.Book_id + '</dd><dt>ຜູ້ແຕ່ງ</dt><dd>' + esc(b.Author) + '</dd><dt>ໝວດໝູ່</dt><dd>' + esc(catName(b.Category_id)) + '</dd>' +
        '<dt>ຈຳນວນທັງໝົດ</dt><dd class="num">' + b.Total_copies + ' ຫົວ</dd><dt>ຈຳນວນທີ່ຍັງຢູ່</dt><dd class="num">' + b.Available_copies + ' ຫົວ</dd></dl>' +
        '<div class="duecard"><h3>ບັດກຳນົດສົ່ງ</h3>' + lines + '</div></div></div>',
      footer: '<button type="button" class="btn danger" data-act="del-book" data-id="' + b.Book_id + '">ລຶບ</button><button type="button" class="btn" data-act="edit-book" data-id="' + b.Book_id + '">ແກ້ໄຂ</button>' +
        '<button type="button" class="btn primary" data-act="borrow" data-id="' + b.Book_id + '"' + (b.Available_copies > 0 ? '' : ' disabled') + '>' + (b.Available_copies > 0 ? 'ຢືມປຶ້ມຫົວນີ້' : 'ປຶ້ມໝົດແລ້ວ') + '</button>'
    });
  }

  function memberForm(id) {
    var m = id ? member(id) : null;
    openModal({
      title: m ? 'ແກ້ໄຂສະມາຊິກ' : 'ເພີ່ມສະມາຊິກໃໝ່', submit: 'ບັນທຶກ',
      body: field('f-name', 'ຊື່ ແລະ ນາມສະກຸນ', 'Name', '<input id="f-name" maxlength="100" value="' + esc(m ? m.Name : '') + '">') +
        '<div class="two">' + field('f-phone', 'ເບີໂທ', 'Phone', '<input id="f-phone" type="tel" maxlength="20" placeholder="020 0000 0000" value="' + esc(m ? m.Phone : '') + '">') +
        field('f-join', 'ວັນສະໝັກ', 'Join_date', '<input id="f-join" type="date" value="' + (m ? m.Join_date : today()) + '">') + '</div>' +
        field('f-addr', 'ທີ່ຢູ່', 'Address', '<textarea id="f-addr" rows="2" maxlength="255">' + esc(m ? m.Address : '') + '</textarea>'),
      onSubmit: function () {
        var name = val('f-name'), phone = val('f-phone'), join = val('f-join'), addr = val('f-addr');
        if (!name) { return fail('ກະລຸນາປ້ອນຊື່ສະມາຊິກ'); }
        if (!/^[0-9+\-\s]{6,20}$/.test(phone)) { return fail('ເບີໂທບໍ່ຖືກຕ້ອງ. ໃຊ້ຕົວເລກ 6 ຫາ 20 ຕົວ'); }
        if (!join) { return fail('ກະລຸນາເລືອກວັນສະໝັກ'); }
        if (m) { m.Name = name; m.Phone = phone; m.Join_date = join; m.Address = addr; }
        else { db.members.push({ member_id: ++db.seq.member, Name: name, Phone: phone, Address: addr, Join_date: join }); }
        commit('ບັນທຶກສະມາຊິກສຳເລັດ'); return true;
      }
    });
  }

  function memberDetail(id) {
    var m = member(id); if (!m) { return; }
    var loans = db.loans.filter(function (l) { return l.member_id === m.member_id; }).reverse();
    var owed = db.fines.filter(function (f) { var l = byId(db.loans, 'Loan_id', f.Loan_id); return !f.Paid && l && l.member_id === m.member_id; }).reduce(function (s, f) { return s + f.Amount; }, 0);
    var rows = loans.map(function (l) {
      var b = book(l.Book_id);
      return '<div class="row">' + cover(b, 'thumb') + '<div class="grow"><div class="t">' + esc(b ? b.Title : '—') + '</div><div class="s num">ຢືມ ' + fmt(l.Loan_date) + ' · ກຳນົດ ' + fmt(l.Due_date) + '</div></div>' + stamp(l.Status) + '</div>';
    }).join('') || '<div class="empty">ຍັງບໍ່ເຄີຍຢືມປຶ້ມ</div>';
    openModal({
      title: 'ປະຫວັດການຢືມ', wide: true,
      body: '<div class="row">' + avatar(m) + '<div class="grow"><div class="t">' + esc(m.Name) + '</div><div class="s num">' + esc(m.Phone) + ' · ສະໝັກ ' + fmt(m.Join_date) + '</div></div></div>' +
        (owed ? '<div class="note bad">ມີຄ່າປັບໄໝຄ້າງຈ່າຍ ' + kip(owed) + '</div>' : '') + '<div class="rows">' + rows + '</div>'
    });
  }

  function borrowForm(bookId) {
    var avail = db.books.filter(function (b) { return b.Available_copies > 0; });
    if (!db.members.length) { toast('ຍັງບໍ່ມີສະມາຊິກ. ກະລຸນາເພີ່ມສະມາຊິກກ່ອນ', true); return; }
    if (!avail.length) { toast('ປຶ້ມທຸກຫົວຖືກຢືມໝົດແລ້ວ', true); return; }
    var t = today();
    openModal({
      title: 'ຢືມປຶ້ມ', submit: 'ຢືນຢັນການຢືມ',
      body: field('f-member', 'ຜູ້ຢືມ', 'member_id', '<select id="f-member">' + db.members.map(function (m) { return '<option value="' + m.member_id + '">#' + m.member_id + ' ' + esc(m.Name) + '</option>'; }).join('') + '</select>') +
        field('f-book', 'ປຶ້ມທີ່ຢືມ', 'Book_id', '<select id="f-book">' + avail.map(function (b) { return '<option value="' + b.Book_id + '"' + (Number(bookId) === b.Book_id ? ' selected' : '') + '>' + esc(b.Title) + ' (ຍັງ ' + b.Available_copies + ')</option>'; }).join('') + '</select>') +
        '<div class="two">' + field('f-loan', 'ວັນຢືມ', 'Loan_date', '<input id="f-loan" type="date" value="' + t + '">') +
        field('f-due', 'ວັນກຳນົດສົ່ງ', 'Due_date', '<input id="f-due" type="date" value="' + addDays(t, LOAN_DAYS) + '">') + '</div>' +
        '<div class="note">ຖ້າສົ່ງຄືນຊ້າກວ່າກຳນົດ ຈະຖືກປັບໄໝ ' + kip(FINE_PER_DAY) + ' ຕໍ່ມື້</div>',
      onSubmit: function () {
        var mid = Number(val('f-member')), bid = Number(val('f-book')), ld = val('f-loan'), dd = val('f-due'), b = book(bid);
        if (!ld || !dd) { return fail('ກະລຸນາເລືອກວັນຢືມ ແລະ ວັນກຳນົດສົ່ງ'); }
        if (dd < ld) { return fail('ວັນກຳນົດສົ່ງຕ້ອງບໍ່ກ່ອນວັນຢືມ'); }
        if (!b || b.Available_copies < 1) { return fail('ປຶ້ມຫົວນີ້ໝົດແລ້ວ. ກະລຸນາເລືອກຫົວອື່ນ'); }
        if (db.loans.some(function (l) { return l.member_id === mid && l.Book_id === bid && !l.Return_date; })) { return fail('ສະມາຊິກຄົນນີ້ກຳລັງຢືມປຶ້ມຫົວນີ້ຢູ່ແລ້ວ'); }
        b.Available_copies--;
        db.loans.push({ Loan_id: ++db.seq.loan, member_id: mid, Book_id: bid, Loan_date: ld, Due_date: dd, Return_date: null, Status: ST.OUT });
        commit('ບັນທຶກການຢືມສຳເລັດ'); return true;
      }
    });
  }

  function returnForm(id) {
    var l = byId(db.loans, 'Loan_id', id); if (!l || l.Return_date) { return; }
    var b = book(l.Book_id), m = member(l.member_id);
    var preview = function (d) {
      var late = d ? Math.max(0, diffDays(l.Due_date, d)) : 0;
      return late ? '<div class="note bad">ສົ່ງຊ້າ ' + late + ' ມື້ · ຄ່າປັບໄໝ ' + kip(late * FINE_PER_DAY) + '</div>' : '<div class="note">ສົ່ງຄືນທັນກຳນົດ. ບໍ່ມີຄ່າປັບໄໝ</div>';
    };
    openModal({
      title: 'ຮັບປຶ້ມຄືນ', submit: 'ຢືນຢັນການຮັບຄືນ',
      body: '<div class="row">' + cover(b, 'thumb') + '<div class="grow"><div class="t">' + esc(b ? b.Title : '—') + '</div><div class="s num">' + esc(m ? m.Name : '—') + ' · ກຳນົດສົ່ງ ' + fmt(l.Due_date) + '</div></div></div>' +
        field('f-ret', 'ວັນສົ່ງຄືນ', 'Return_date', '<input id="f-ret" type="date" min="' + l.Loan_date + '" value="' + today() + '">') + '<div id="ret-preview">' + preview(today()) + '</div>',
      onOpen: function () { $('#f-ret').addEventListener('input', function (e) { $('#ret-preview').innerHTML = preview(e.target.value); }); },
      onSubmit: function () {
        var d = val('f-ret');
        if (!d) { return fail('ກະລຸນາເລືອກວັນສົ່ງຄືນ'); }
        if (d < l.Loan_date) { return fail('ວັນສົ່ງຄືນຕ້ອງບໍ່ກ່ອນວັນຢືມ'); }
        l.Return_date = d; l.Status = ST.BACK;
        if (b) { b.Available_copies = Math.min(b.Total_copies, b.Available_copies + 1); }
        var late = diffDays(l.Due_date, d);
        if (late > 0) { db.fines.push({ Fine_id: ++db.seq.fine, Loan_id: l.Loan_id, Amount: late * FINE_PER_DAY, Paid: 0, Paid_date: null }); }
        commit(late > 0 ? 'ຮັບຄືນແລ້ວ. ມີຄ່າປັບໄໝ ' + kip(late * FINE_PER_DAY) : 'ຮັບປຶ້ມຄືນສຳເລັດ'); return true;
      }
    });
  }

  function catForm(id) {
    var c = id ? category(id) : null;
    openModal({
      title: c ? 'ປ່ຽນຊື່ໝວດໝູ່' : 'ເພີ່ມໝວດໝູ່ໃໝ່', submit: 'ບັນທຶກ',
      body: field('f-cname', 'ຊື່ໝວດໝູ່', 'category_name', '<input id="f-cname" maxlength="100" value="' + esc(c ? c.category_name : '') + '">'),
      onSubmit: function () {
        var name = val('f-cname');
        if (!name) { return fail('ກະລຸນາປ້ອນຊື່ໝວດໝູ່'); }
        if (db.categories.some(function (x) { return x.category_name.toLowerCase() === name.toLowerCase() && x !== c; })) { return fail('ຊື່ໝວດໝູ່ນີ້ມີຢູ່ແລ້ວ. ກະລຸນາໃຊ້ຊື່ອື່ນ'); }
        if (c) { c.category_name = name; } else { db.categories.push({ category_id: ++db.seq.category, category_name: name }); }
        commit('ບັນທຶກໝວດໝູ່ສຳເລັດ'); return true;
      }
    });
  }

  var ACT = {
    close: closeModal,
    cat: function (id) { ui.cat = Number(id); render(); },
    'loan-filter': function (id) { ui.loanFilter = id; render(); },
    'fine-filter': function (id) { ui.fineFilter = id; render(); },
    book: bookDetail, 'add-book': function () { bookForm(); }, 'edit-book': bookForm,
    'del-book': function (id) {
      var b = book(id);
      if (db.loans.some(function (l) { return l.Book_id === b.Book_id; })) { closeModal(); toast('ລຶບບໍ່ໄດ້ ເພາະປຶ້ມຫົວນີ້ມີປະຫວັດການຢືມ', true); return; }
      confirmBox('ລຶບປຶ້ມ', 'ຕ້ອງການລຶບ "' + esc(b.Title) + '" ແທ້ບໍ? ລຶບແລ້ວກູ້ຄືນບໍ່ໄດ້.', 'ລຶບປຶ້ມ', function () {
        db.books = db.books.filter(function (x) { return x !== b; }); commit('ລຶບປຶ້ມແລ້ວ');
      });
    },
    member: memberDetail, 'add-member': function () { memberForm(); }, 'edit-member': memberForm,
    'del-member': function (id) {
      var m = member(id);
      if (db.loans.some(function (l) { return l.member_id === m.member_id; })) { toast('ລຶບບໍ່ໄດ້ ເພາະສະມາຊິກຄົນນີ້ມີປະຫວັດການຢືມ', true); return; }
      confirmBox('ລຶບສະມາຊິກ', 'ຕ້ອງການລຶບ "' + esc(m.Name) + '" ແທ້ບໍ? ລຶບແລ້ວກູ້ຄືນບໍ່ໄດ້.', 'ລຶບສະມາຊິກ', function () {
        db.members = db.members.filter(function (x) { return x !== m; }); commit('ລຶບສະມາຊິກແລ້ວ');
      });
    },
    borrow: borrowForm, 'return': returnForm,
    pay: function (id) {
      var f = byId(db.fines, 'Fine_id', id), l = byId(db.loans, 'Loan_id', f.Loan_id) || {}, m = member(l.member_id);
      confirmBox('ຮັບເງິນຄ່າປັບໄໝ', 'ຮັບເງິນ <strong>' + kip(f.Amount) + '</strong> ຈາກ ' + esc(m ? m.Name : '—') + ' ແລ້ວບໍ?', 'ຢືນຢັນຮັບເງິນ', function () {
        f.Paid = 1; f.Paid_date = today(); commit('ບັນທຶກການຈ່າຍເງິນແລ້ວ');
      });
    },
    'cat-go': function (id) { ui.cat = Number(id); location.hash = 'books'; },
    'add-cat': function () { catForm(); }, 'edit-cat': catForm,
    'del-cat': function (id) {
      var c = category(id);
      if (db.books.some(function (b) { return b.Category_id === c.category_id; })) { toast('ລຶບບໍ່ໄດ້ ເພາະຍັງມີປຶ້ມຢູ່ໃນໝວດໝູ່ນີ້', true); return; }
      confirmBox('ລຶບໝວດໝູ່', 'ຕ້ອງການລຶບໝວດໝູ່ "' + esc(c.category_name) + '" ແທ້ບໍ?', 'ລຶບໝວດໝູ່', function () {
        db.categories = db.categories.filter(function (x) { return x !== c; }); if (ui.cat === c.category_id) { ui.cat = 0; } commit('ລຶບໝວດໝູ່ແລ້ວ');
      });
    }
  };

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (el && !el.disabled) { e.preventDefault(); ACT[el.dataset.act](el.dataset.id); return; }
    if (e.target.id === 'overlay') { closeModal(); }
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'modal-form' && modalSubmit) {
      if (modalSubmit() === true && modalSubmit) { closeModal(); }
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'q') {
      ui.q = e.target.value;
      $('#view').classList.remove('enter');
      $('#view').innerHTML = VIEWS[route()]();
      var q = $('#q'); q.focus(); q.setSelectionRange(ui.q.length, ui.q.length);
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'f-cover') { readCover(e.target.files[0]); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('#overlay').hidden) { closeModal(); }
  });
  window.addEventListener('hashchange', function () { ui.q = ''; closeModal(); render(true); $('.main').scrollTop = 0; });

  load();
  render(true);
  setInterval(tick, 1000);
})();
