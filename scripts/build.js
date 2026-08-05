// build.js - 构建/更新 GitHub 热门项目情报站
// 用法: node scripts/build.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const RAW_DIR = path.join(REPORTS_DIR, 'raw');
const SOURCE_DIRS = [
  'C:/Users/Administrator/Documents/codex项目/GitHub热门项目',
  'C:/Users/Administrator/Documents/Codex/2026-08-04/12-github/outputs',
  path.join(REPORTS_DIR, 'source')
];
const PATTERNS = [
  { re: /^GitHub每日热门日报_(\d{4}-\d{2}-\d{2})\.md$/, type: 'daily', label: '每日日报', icon: '📄' },
  { re: /^GitHub每周潜力项目汇总_(\d{4}-\d{2}-\d{2})\.md$/, type: 'weekly', label: '每周汇总', icon: '📊' },
  { re: /^GitHub每月趋势总结_(\d{4}-\d{2})\.md$/, type: 'monthly', label: '月度总结', icon: '📈' }
];

// ---------- Markdown 迷你渲染器（覆盖本报告使用的格式） ----------
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function renderInline(text) {
  let t = escapeHtml(text);
  const codes = [];
  t = t.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  t = t.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + codes[+i] + '</code>');
  return t;
}
function renderTable(rows) {
  const header = rows[0].map(c => '<th>' + renderInline(c.trim()) + '</th>').join('');
  const body = rows.slice(2).map(r => '<tr>' + r.map(c => '<td>' + renderInline(c.trim()) + '</td>').join('') + '</tr>').join('');
  return '<div class="table-wrap"><table><thead><tr>' + header + '</tr></thead><tbody>' + body + '</tbody></table></div>';
}
function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  let listType = null;
  while (i < lines.length) {
    let line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim().split('|').slice(1, -1)); i++; }
      out.push(renderTable(rows));
      continue;
    }
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      if (listType) { out.push('</' + listType + '>'); listType = null; }
      const lv = h[1].length;
      out.push('<h' + lv + '>' + renderInline(h[2]) + '</h' + lv + '>');
      i++; continue;
    }
    const ul = trimmed.match(/^[-*]\s+(.*)$/);
    const ol = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      const content = (ul ? ul[1] : ol[1]);
      if (listType !== tag) { if (listType) out.push('</' + listType + '>'); out.push('<' + tag + '>'); listType = tag; }
      out.push('<li>' + renderInline(content) + '</li>');
      i++; continue;
    }
    if (listType) { out.push('</' + listType + '>'); listType = null; }
    if (trimmed.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
      out.push('<blockquote>' + renderInline(buf.join(' ')) + '</blockquote>');
      continue;
    }
    if (/^-{3,}$/.test(trimmed)) { out.push('<hr>'); i++; continue; }
    if (trimmed === '') { i++; continue; }
    out.push('<p>' + renderInline(trimmed) + '</p>');
    i++;
  }
  if (listType) out.push('</' + listType + '>');
  return out.join('\n');
}

// ---------- 收集源文件 ----------
function collectSourceFiles() {
  const found = new Map();
  for (const dir of SOURCE_DIRS) {
    if (!fs.existsSync(dir)) continue;
    let files = [];
    try { files = fs.readdirSync(dir); } catch (e) { continue; }
    for (const f of files) {
      for (const p of PATTERNS) {
        const m = f.match(p.re);
        if (m) {
          const full = path.join(dir, f);
          const st = fs.statSync(full);
          if (!found.has(f) || st.mtimeMs > found.get(f).mtimeMs) {
            found.set(f, { name: f, date: m[1], type: p.type, label: p.label, icon: p.icon, full, mtimeMs: st.mtimeMs });
          }
        }
      }
    }
  }
  // 兜底：若常规位置未找到报告，则递归搜索 Documents 下的常见报告目录
  if (found.size === 0) {
    const roots = ['C:/Users/Administrator/Documents/codex项目', 'C:/Users/Administrator/Documents/Codex'];
    const walk = (dir, depth) => {
      if (depth > 4) return;
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full, depth + 1);
        else {
          for (const ptn of PATTERNS) {
            if (ptn.re.test(ent.name)) {
              const st = fs.statSync(full);
              if (!found.has(ent.name) || st.mtimeMs > found.get(ent.name).mtimeMs) {
                found.set(ent.name, { name: ent.name, date: ent.name.match(/(\d{4}-\d{2}(?:-\d{2})?)/)[1], type: ptn.type, label: ptn.label, icon: ptn.icon, full, mtimeMs: st.mtimeMs });
              }
            }
          }
        }
      }
    };
    roots.forEach(r => { if (fs.existsSync(r)) walk(r, 0); });
  }
  return [...found.values()].sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- 生成单页 HTML ----------
function makeReportPage(meta, md) {
  const body = renderMarkdown(md);
  const title = (md.match(/^#\s+(.+)$/m) || [null, meta.name.replace(/\.md$/, '')])[1].trim();
  const date = meta.date;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body class="report-page">
<header class="report-top">
  <a class="back" href="../index.html">← 返回首页</a>
  <span class="badge ${meta.type}">${meta.icon} ${meta.label}</span>
  <span class="date">${date}</span>
</header>
<div class="export-toolbar">
  <span class="export-label">导出本报告：</span>
  <button id="export-pdf" class="export-btn">PDF</button>
  <button id="export-excel" class="export-btn">Excel</button>
  <button id="export-ppt" class="export-btn">PPT</button>
  <span id="export-status" class="export-status"></span>
</div>
<main class="report-main">${body}</main>
<footer class="site-footer">GitHub 热门项目情报站 · 自动生成于 ${meta.buildTime}</footer>
<script src="../assets/vendor/jspdf.umd.min.js"></script>
<script src="../assets/vendor/html2canvas.min.js"></script>
<script src="../assets/vendor/xlsx.full.min.js"></script>
<script src="../assets/vendor/pptxgen.bundle.js"></script>
<script src="../assets/export.js"></script>
<script>
(function () {
  var last = null;
  function check() {
    fetch('../version.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (!v || !v.updated) return;
        if (last && v.updated !== last) location.reload();
        last = v.updated;
      })
      .catch(function () {});
  }
  check();
  setInterval(check, 60000);
})();
</script></body>
</html>`;
}

// ---------- 汇总摘要 ----------
function summaryOf(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  let buf = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) { if (buf.length) break; continue; }
    if (t.startsWith('#')) continue;
    if (t.startsWith('>')) { buf.push(t.replace(/^>\s?/, '').replace(/\*\*/g, '')); continue; }
    buf.push(t.replace(/\*\*/g, ''));
    if (buf.join(' ').length > 120) break;
  }
  return buf.join(' ').replace(/\s+/g, ' ').slice(0, 160);
}

// ---------- 主流程 ----------
function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const files = collectSourceFiles();
  const now = new Date().toISOString();
  const items = [];
  for (const f of files) {
    const md = fs.readFileSync(f.full, 'utf8').replace(/^\uFEFF/, '');
    fs.copyFileSync(f.full, path.join(RAW_DIR, f.name));
    const slug = f.name.replace(/\.md$/, '');
    const htmlName = slug + '.html';
    const page = makeReportPage(f, md);
    fs.writeFileSync(path.join(REPORTS_DIR, htmlName), page, 'utf8');
    items.push({
      name: f.name, html: htmlName, type: f.type, label: f.label, icon: f.icon,
      date: f.date, title: (md.match(/^#\s+(.+)$/m) || [null, f.name])[1].trim(),
      summary: summaryOf(md), source: f.full
    });
  }
  const index = { updated: now, items };
  fs.writeFileSync(path.join(REPORTS_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'version.json'), JSON.stringify({ updated: now }, null, 2), 'utf8');

  const stats = {
    daily: items.filter(x => x.type === 'daily').length,
    weekly: items.filter(x => x.type === 'weekly').length,
    monthly: items.filter(x => x.type === 'monthly').length
  };
  stats.total = items.length;
  const listHtml = items.map(it => `{
    name: ${JSON.stringify(it.name)},
    html: ${JSON.stringify(it.html)},
    type: ${JSON.stringify(it.type)},
    label: ${JSON.stringify(it.label)},
    icon: ${JSON.stringify(it.icon)},
    date: ${JSON.stringify(it.date)},
    title: ${JSON.stringify(it.title)},
    summary: ${JSON.stringify(it.summary)}
  }`).join(',\n  ');
  const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitHub 热门项目情报站</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header class="hero">
  <h1>GitHub 热门项目情报站</h1>
  <p>每日 · 每周 · 每月 自动追踪热门开源项目，助力学习与 AI 客户端能力强化</p>
  <div class="updated" id="updated">最后更新：${now}</div>
</header>
<section class="stats" id="stats">
  <div class="stat"><b>${stats.daily}</b><span>每日日报</span></div>
  <div class="stat"><b>${stats.weekly}</b><span>每周汇总</span></div>
  <div class="stat"><b>${stats.monthly}</b><span>月度总结</span></div>
  <div class="stat"><b>${stats.total}</b><span>报告总数</span></div>
</section>
<div class="controls">
  <div class="filters" id="filters">
    <button data-filter="all" class="active">全部</button>
    <button data-filter="daily">📄 每日日报</button>
    <button data-filter="weekly">📊 每周汇总</button>
    <button data-filter="monthly">📈 月度总结</button>
  </div>
  <input id="search" type="search" placeholder="搜索项目 / 关键词…" autocomplete="off">
</div>
<main id="cards" class="cards"></main>
<footer class="site-footer">
  <p>数据来源：GitHub Trending + GitHub API · 由 Codex 自动收集整理</p>
  <p>网站每 60 秒自动检查更新；也可点击 <button id="refresh" class="link-btn">手动刷新</button></p>
</footer>
<script>
window.__REPORT_DATA__ = { updated: ${JSON.stringify(now)}, items: [${listHtml}] };
</script>
<script src="assets/app.js"></script>
</body>
</html>`;
  fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml, 'utf8');

  console.log('构建完成：' + items.length + ' 份报告');
  items.forEach(it => console.log(' - [' + it.type + '] ' + it.name));
}

main();





