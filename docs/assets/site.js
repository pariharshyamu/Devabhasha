// Devabhāṣā docs — tiny, dependency-free interactivity.
(function () {
  // theme: remember choice, else follow the system
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem('deva-theme');
    if (saved) root.setAttribute('data-theme', saved);
  } catch (e) {}
  function toggleTheme() {
    var cur = root.getAttribute('data-theme');
    if (!cur) cur = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('deva-theme', next); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    var a = t.getAttribute('data-action');
    if (a === 'theme') toggleTheme();
    if (a === 'menu') document.querySelector('.sidebar') && document.querySelector('.sidebar').classList.toggle('open');
    if (a === 'copy') {
      var pre = t.parentElement.querySelector('code');
      if (pre) navigator.clipboard && navigator.clipboard.writeText(pre.innerText).then(function () {
        var o = t.textContent; t.textContent = 'copied ✓';
        setTimeout(function () { t.textContent = o; }, 1200);
      });
    }
  });

  // add copy buttons + anchor links after load
  document.querySelectorAll('main pre').forEach(function (pre) {
    if (pre.parentElement.classList.contains('code-wrap')) return;
    var w = document.createElement('div'); w.className = 'code-wrap';
    pre.parentNode.insertBefore(w, pre); w.appendChild(pre);
    var b = document.createElement('button'); b.className = 'copy-btn'; b.textContent = 'copy';
    b.setAttribute('data-action', 'copy'); w.appendChild(b);
  });
  document.querySelectorAll('main h2[id], main h3[id]').forEach(function (h) {
    var a = document.createElement('a'); a.className = 'anchor'; a.href = '#' + h.id; a.textContent = '#';
    h.appendChild(a);
  });

  // scroll-spy: highlight the sidebar link for the section in view
  var links = Array.prototype.slice.call(document.querySelectorAll('.sidebar a[href^="#"]'));
  if (links.length) {
    var map = {};
    links.forEach(function (l) { var id = l.getAttribute('href').slice(1); var el = document.getElementById(id); if (el) map[id] = l; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('active'); });
          if (map[en.target.id]) map[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-72px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { obs.observe(document.getElementById(id)); });
  }
})();
