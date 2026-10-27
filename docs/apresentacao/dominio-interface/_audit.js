// Só entra com `node build.mjs --audit`: mede, em cada slide, o que transborda.
document.fonts.ready.then(function () {
  var out = [];
  document.querySelectorAll('.slide').forEach(function (s, n) {
    var sr = s.getBoundingClientRect(), k = sr.width / 1280;
    function over(el, what) {
      var dh = el.scrollHeight - el.clientHeight, dw = el.scrollWidth - el.clientWidth;
      if (dh > 1 || dw > 1) out.push((n + 1) + ' ' + what + ' +' + Math.max(dh, 0) + 'h +' + Math.max(dw, 0) + 'w');
    }
    s.querySelectorAll('.body').forEach(function (e) { over(e, 'body'); });
    s.querySelectorAll('.panel').forEach(function (e, i) { over(e, 'panel' + (i + 1)); });
    s.querySelectorAll('.cb pre').forEach(function (e, i) { over(e, 'code' + (i + 1)); });
    
    var b = s.querySelector('.body');
    if (b) {
      var bottom = (b.getBoundingClientRect().bottom - sr.top) / k;
      if (bottom > 662) out.push((n + 1) + ' body-bottom ' + Math.round(bottom));
      b.querySelectorAll('*').forEach(function (e) {
        var r = e.getBoundingClientRect();
        if (r.width && (r.right - sr.left) / k > 1218) out.push((n + 1) + ' right-edge ' + e.className + ' ' + Math.round((r.right - sr.left) / k));
      });
    }
    var rf = s.querySelector('.refs');
    if (rf && rf.getBoundingClientRect().height / k > 62) out.push((n + 1) + ' refs-3-linhas');
  });
  var pre = document.createElement('pre');
  pre.id = 'audit';
  pre.textContent = out.length ? out.join('\n') : 'OK';
  document.body.appendChild(pre);
});
// chips que invadem a célula vizinha
document.fonts.ready.then(function () {
  setTimeout(function () {
    var out = [];
    document.querySelectorAll('.slide').forEach(function (s, n) {
      s.querySelectorAll('td').forEach(function (td) {
        if (td.scrollWidth > td.clientWidth + 1) out.push((n + 1) + ' celula +' + (td.scrollWidth - td.clientWidth) + 'w: ' + td.textContent.trim().slice(0, 40));
      });
    });
    var pre = document.getElementById('audit');
    if (out.length) pre.textContent = (pre.textContent === 'OK' ? '' : pre.textContent + '\n') + out.join('\n');
  }, 50);
});
