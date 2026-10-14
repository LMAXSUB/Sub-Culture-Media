document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');

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
  }

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var grid = document.getElementById('posts-grid');
  if (!grid) return;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function first(item, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (item && item[keys[i]] != null && item[keys[i]] !== '') return item[keys[i]];
    }
    return '';
  }

  fetch('posts.json', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load posts.json');
      return response.json();
    })
    .then(function (posts) {
      if (!Array.isArray(posts)) throw new Error('Invalid posts.json');

      grid.innerHTML = '';

      if (!posts.length) {
        grid.innerHTML = '<p class="posts-empty">No articles available right now.</p>';
        return;
      }

      posts.forEach(function (post) {
        var title = first(post, ['title', 'name']);
        var date = first(post, ['date', 'published', 'publishedAt']);
        var excerpt = first(post, ['excerpt', 'description', 'summary']);
        var image = first(post, ['image', 'cover', 'thumbnail', 'photo']);
        var url = first(post, ['url', 'link', 'href', 'file']);

        if (!url) url = '#';

        var card = document.createElement('a');
        card.className = 'post-card';
        card.href = url;

        var imageHTML = image
          ? '<div class="post-card-image"><img src="' + esc(image) + '" alt="' + esc(title) + '" loading="lazy"></div>'
          : '';

        card.innerHTML = imageHTML +
          (date ? '<div class="post-card-date">' + esc(date) + '</div>' : '') +
          '<h3>' + esc(title) + '</h3>' +
          (excerpt ? '<p>' + esc(excerpt) + '</p>' : '');

        grid.appendChild(card);
      });
    })
    .catch(function () {
      grid.innerHTML = '<p class="posts-empty">Articles could not be loaded right now. Please refresh the page.</p>';
    });
});
