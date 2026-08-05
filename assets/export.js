/* export.js - 报告导出：PDF / Excel / PPT */
(function () {
  'use strict';
  var main = document.querySelector('.report-main');
  if (!main) return;

  var statusEl = document.getElementById('export-status');

  function status(msg, isErr) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = isErr ? '#cf222e' : '#1f883d';
    if (!isErr) {
      setTimeout(function () { if (statusEl.getAttribute('data-keep') !== '1') statusEl.textContent = ''; }, 8000);
    }
  }

  function filename(ext) {
    var t = (document.title || '报告').replace(/[\\/:*?"<>|]/g, '_').replace(/ · /g, '_').replace(/\s+/g, '_');
    return t + ext;
  }

  function autoDownload(blob, name) {
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 8000);
      return true;
    } catch (e) { return false; }
  }

  function showDownloadLink(blob, name) {
    if (!statusEl) return;
    try {
      var url = URL.createObjectURL(blob);
      statusEl.setAttribute('data-keep', '1');
      statusEl.style.color = '#1f883d';
      statusEl.innerHTML = '文件已生成，若未自动下载，<a href="' + url + '" download="' + name + '" style="color:#0969da;font-weight:bold;text-decoration:underline;">点击这里下载</a>';
    } catch (e) { /* ignore */ }
  }

  function done(blob, name) {
    autoDownload(blob, name);
    showDownloadLink(blob, name);
  }

  function clip(txt, n) {
    txt = txt.replace(/\s+/g, ' ').trim();
    return txt.length > n ? txt.slice(0, n) + '…' : txt;
  }

  // ---------- PDF ----------
  async function exportPDF() {
    try {
      status('正在生成 PDF…');
      if (!window.jspdf || !window.html2canvas) { status('PDF 组件未加载，请刷新页面重试', true); return; }
      var { jsPDF } = window.jspdf;
      var clone = main.cloneNode(true);
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:absolute;left:-10000px;top:0;width:800px;background:#fff;';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      var canvas = await html2canvas(clone, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 900 });
      document.body.removeChild(wrapper);
      var pdf = new jsPDF('p', 'pt', 'a4');
      var pageW = pdf.internal.pageSize.getWidth();
      var pageH = pdf.internal.pageSize.getHeight();
      var imgH = canvas.height * pageW / canvas.width;
      var imgData = canvas.toDataURL('image/jpeg', 0.92);
      var left = imgH;
      var pos = 0;
      pdf.addImage(imgData, 'JPEG', 0, pos, pageW, imgH);
      left -= pageH;
      while (left > 0) {
        pos -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, pos, pageW, imgH);
        left -= pageH;
      }
      var blob = pdf.output('blob');
      status('PDF 已生成 ✓');
      done(blob, filename('.pdf'));
    } catch (e) { status('PDF 生成失败：' + e.message, true); }
  }

  // ---------- Excel ----------
  function exportExcel() {
    try {
      status('正在生成 Excel…');
      if (!window.XLSX) { status('Excel 组件未加载，请刷新页面重试', true); return; }
      var tables = main.querySelectorAll('table');
      if (!tables.length) { status('本报告没有可导出的表格', true); return; }
      var wb = XLSX.utils.book_new();
      tables.forEach(function (t, i) {
        var rows = [];
        t.querySelectorAll('tr').forEach(function (tr) {
          var row = [];
          tr.querySelectorAll('th, td').forEach(function (c) { row.push(c.innerText.trim()); });
          rows.push(row);
        });
        var ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, '表格' + (i + 1));
      });
      var out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      var blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      status('Excel 已生成 ✓');
      done(blob, filename('.xlsx'));
    } catch (e) { status('Excel 生成失败：' + e.message, true); }
  }

  // ---------- PPT ----------
  // 收集某个 h2 小节内的全部内容（含列表/表格/段落），返回 [{text, isTitle}]
  function collectSection(h2, nextH2) {
    var out = [];
    var end = nextH2 || main.lastElementChild;
    var range = document.createRange();
    range.setStartAfter(h2);
    try { range.setEndBefore(end); } catch (e) { range.setEndAfter(h2); }
    var frag = range.cloneContents();
    var els = frag.querySelectorAll('h3, h4, p, li, blockquote, table, pre');
    els.forEach(function (el) {
      var tag = el.tagName;
      if (tag === 'H3' || tag === 'H4') {
        var t = el.innerText.replace(/\s+/g, ' ').trim();
        if (t) out.push({ text: t, isTitle: true });
      } else if (tag === 'TABLE') {
        el.querySelectorAll('tr').forEach(function (tr, idx) {
          if (idx < 8) {
            var cells = [];
            tr.querySelectorAll('th, td').forEach(function (c) { cells.push(c.innerText.trim()); });
            out.push({ text: clip(cells.join('  |  '), 200), isTitle: false });
          }
        });
      } else if (tag === 'PRE') {
        var code = el.innerText.replace(/\s+/g, ' ').trim();
        if (code) out.push({ text: clip(code, 200), isTitle: false });
      } else {
        var txt = el.innerText.replace(/\s+/g, ' ').trim();
        if (txt) out.push({ text: clip(txt, 200), isTitle: false });
      }
    });
    return out;
  }

  async function exportPPT() {
    try {
      status('正在生成 PPT…');
      if (!window.PptxGenJS) { status('PPT 组件未加载，请刷新页面重试', true); return; }
      var pptx = new PptxGenJS();
      var title = (document.title || '报告').replace(' | GitHub 热门项目情报站', '');

      var slide = pptx.addSlide();
      slide.background = { color: 'F6F8FA' };
      slide.addText(title, { x: 0.5, y: 1.6, w: 9, h: 1.6, fontSize: 26, align: 'center', bold: true, color: '1F2328' });
      slide.addText('GitHub 热门项目情报站 · 自动生成', { x: 0.5, y: 3.3, w: 9, h: 0.6, fontSize: 14, align: 'center', color: '888888' });

      var h2s = Array.prototype.slice.call(main.querySelectorAll('h2'));
      h2s.forEach(function (h2, hi) {
        var nextH2 = h2s[hi + 1] || null;
        var bullets = collectSection(h2, nextH2);
        if (!bullets.length) return;
        var chunkSize = 12;
        for (var c = 0; c < bullets.length; c += chunkSize) {
          var chunk = bullets.slice(c, c + chunkSize);
          var s = pptx.addSlide();
          s.background = { color: 'FFFFFF' };
          var pageTitle = h2.innerText + (c > 0 ? '（续）' : '');
          s.addText(pageTitle, { x: 0.4, y: 0.3, w: 9.2, h: 0.8, fontSize: 20, bold: true, color: '0969DA' });
          var items = chunk.map(function (b) {
            return {
              text: b.text,
              options: {
                bullet: b.isTitle ? { code: '25AA' } : { code: '2022' },
                bold: !!b.isTitle,
                breakLine: true,
                fontSize: b.isTitle ? 14 : 12
              }
            };
          });
          s.addText(items, { x: 0.5, y: 1.2, w: 9, h: 5.6, color: '24292F', valign: 'top', lineSpacingMultiple: 1.1 });
        }
      });

      var blob = await pptx.write('blob');
      status('PPT 已生成 ✓');
      done(blob, filename('.pptx'));
    } catch (e) { status('PPT 生成失败：' + e.message, true); }
  }

  var btnPdf = document.getElementById('export-pdf');
  var btnExcel = document.getElementById('export-excel');
  var btnPpt = document.getElementById('export-ppt');
  if (btnPdf) btnPdf.addEventListener('click', exportPDF);
  if (btnExcel) btnExcel.addEventListener('click', exportExcel);
  if (btnPpt) btnPpt.addEventListener('click', exportPPT);
})();
