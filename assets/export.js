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
    if (!isErr) setTimeout(function () { statusEl.textContent = ''; }, 6000);
  }
  function filename(ext) {
    var t = (document.title || '报告').replace(/[\\/:*?"<>|]/g, '_').replace(/ · /g, '_').replace(/\s+/g, '_');
    return t + ext;
  }

  // ---------- PDF ----------
  async function exportPDF() {
    try {
      status('正在生成 PDF…');
      if (!window.jspdf || !window.html2canvas) { status('PDF 组件未加载，请刷新重试', true); return; }
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
      pdf.save(filename('.pdf'));
      status('PDF 已生成 ✓');
    } catch (e) { status('PDF 生成失败：' + e.message, true); }
  }

  // ---------- Excel ----------
  function exportExcel() {
    try {
      status('正在生成 Excel…');
      if (!window.XLSX) { status('Excel 组件未加载，请刷新重试', true); return; }
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
      XLSX.writeFile(wb, filename('.xlsx'));
      status('Excel 已生成 ✓');
    } catch (e) { status('Excel 生成失败：' + e.message, true); }
  }

  // ---------- PPT ----------
  function exportPPT() {
    try {
      status('正在生成 PPT…');
      if (!window.PptxGenJS) { status('PPT 组件未加载，请刷新重试', true); return; }
      var pptx = new PptxGenJS();
      var title = (document.title || '报告').replace(' | GitHub 热门项目情报站', '');
      var slide = pptx.addSlide();
      slide.background = { color: 'F6F8FA' };
      slide.addText(title, { x: 0.5, y: 1.6, w: 9, h: 1.6, fontSize: 26, align: 'center', bold: true, color: '1F2328' });
      slide.addText('GitHub 热门项目情报站 · 自动生成', { x: 0.5, y: 3.3, w: 9, h: 0.6, fontSize: 14, align: 'center', color: '888888' });

      var h2s = main.querySelectorAll('h2');
      h2s.forEach(function (h2) {
        var s = pptx.addSlide();
        s.background = { color: 'FFFFFF' };
        s.addText(h2.innerText, { x: 0.4, y: 0.3, w: 9.2, h: 0.8, fontSize: 22, bold: true, color: '0969DA' });
        var bullets = [];
        var el = h2.nextElementSibling;
        var guard = 0;
        while (el && el.tagName !== 'H2' && guard++ < 200) {
          if (el.tagName === 'P' || el.tagName === 'LI') {
            var txt = el.innerText.replace(/\s+/g, ' ').trim();
            if (txt && txt.length <= 220) bullets.push(txt);
          } else if (el.tagName === 'TABLE') {
            el.querySelectorAll('tr').forEach(function (tr, idx) {
              if (idx < 6) {
                var cells = [];
                tr.querySelectorAll('th, td').forEach(function (c) { cells.push(c.innerText.trim()); });
                bullets.push(cells.join('  |  '));
              }
            });
          } else if (el.tagName === 'BLOCKQUOTE') {
            var bt = el.innerText.replace(/\s+/g, ' ').trim();
            if (bt && bt.length <= 220) bullets.push(bt);
          }
          el = el.nextElementSibling;
        }
        if (bullets.length) {
          s.addText(bullets.slice(0, 16), { x: 0.5, y: 1.3, w: 9, h: 5.4, fontSize: 12, bullet: { code: '2022' }, lineSpacingMultiple: 1.15, color: '24292F' });
        }
      });
      pptx.writeFile({ fileName: filename('.pptx') });
      status('PPT 已生成 ✓');
    } catch (e) { status('PPT 生成失败：' + e.message, true); }
  }

  var btnPdf = document.getElementById('export-pdf');
  var btnExcel = document.getElementById('export-excel');
  var btnPpt = document.getElementById('export-ppt');
  if (btnPdf) btnPdf.addEventListener('click', exportPDF);
  if (btnExcel) btnExcel.addEventListener('click', exportExcel);
  if (btnPpt) btnPpt.addEventListener('click', exportPPT);
})();
