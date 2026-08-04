(function () {
  'use strict';
  var state = { items: [], filter: 'all', query: '', lastVersion: null };

  function el(id) { return document.getElementById(id); }

  function renderStats() {
    var stats = { daily: 0, weekly: 0, monthly: 0, total: state.items.length };
    state.items.forEach(function (it) {
      if (stats[it.type] !== undefined) stats[it.type]++;
    });
    var box = el('stats');
    if (!box) return;
    box.innerHTML =
      '<div class="stat"><b>' + stats.daily + '</b><span>每日日报</span></div>' +
      '<div class="stat"><b>' + stats.weekly + '</b><span>每周汇总</span></div>' +
      '<div class="stat"><b>' + stats.monthly + '</b><span>月度总结</span></div>' +
      '<div class="stat"><b>' + stats.total + '</b><span>报告总数</span></div>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderCards() {
    var q = state.query.trim().toLowerCase();
    var list = state.items.filter(function (it) {
      if (state.filter !== 'all' && it.type !== state.filter) return false;
      if (!q) return true;
      return (it.title + ' ' + it.summary + ' ' + it.name + ' ' + it.label).toLowerCase().indexOf(q) !== -1;
    });
    var box = el('cards');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="empty">暂无符合条件的报告</div>';
      return;
    }
    box.innerHTML = list.map(function (it) {
      return '<a class="card" href="reports/' + encodeURIComponent(it.html) + '">' +
        '<span class="badge ' + esc(it.type) + '">' + esc(it.icon + ' ' + it.label) + '</span>' +
        '<h3>' + esc(it.title) + '</h3>' +
        '<span class="date">' + esc(it.date) + '</span>' +
        '<p class="summary">' + esc(it.summary) + '</p>' +
        '</a>';
    }).join('');
  }

  function setUpdated(ts) {
    var u = el('updated');
    if (u && ts) u.textContent = '最后更新：' + ts.replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  }

  function applyData(data) {
    if (!data || !data.items) return;
    state.items = data.items;
    if (data.updated) setUpdated(data.updated);
    renderStats();
    renderCards();
  }

  function loadRemote() {
    return fetch('reports/index.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(applyData)
      .catch(function () { /* 本地 file:// 场景忽略 */ });
  }

  function checkVersion() {
    fetch('version.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (!v || !v.updated) return;
        if (state.lastVersion && v.updated !== state.lastVersion) {
          state.lastVersion = v.updated;
          loadRemote(); // 有新内容，拉取最新数据并刷新页面列表
        } else {
          state.lastVersion = v.updated;
        }
      })
      .catch(function () {});
  }

  // 初始化
  if (window.__REPORT_DATA__ && window.__REPORT_DATA__.items) {
    applyData(window.__REPORT_DATA__);
    state.lastVersion = window.__REPORT_DATA__.updated || null;
  }
  loadRemote(); // 若通过 HTTP 访问，重新拉取确保最新

  // 筛选
  var filters = el('filters');
  if (filters) filters.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    state.filter = btn.getAttribute('data-filter') || 'all';
    filters.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b === btn); });
    renderCards();
  });

  // 搜索
  var search = el('search');
  if (search) search.addEventListener('input', function () { state.query = search.value; renderCards(); });

  // 手动刷新
  var refresh = el('refresh');
  if (refresh) refresh.addEventListener('click', function () { loadRemote(); });

  // 每 60 秒检查一次更新
  setInterval(checkVersion, 60000);
})();
