document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');

  /* Existing mobile navigation */
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    /* Add the RAF research resource to the existing homepage navigation
       without requiring a rewrite of index.html. */
    if (!nav.querySelector('a[href="raf-awards.html"]')) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = 'raf-awards.html';
      a.textContent = 'RAF Awards';
      li.appendChild(a);

      var contactItem = Array.from(nav.querySelectorAll('li')).find(function (item) {
        var link = item.querySelector('a');
        return link && link.getAttribute('href') === '#consult';
      });
      if (contactItem) {
        nav.insertBefore(li, contactItem);
      } else {
        nav.appendChild(li);
      }
    }
  }

  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});
