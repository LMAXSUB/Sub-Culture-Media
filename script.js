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
  }

  /* Existing footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* Sub Culture articles */
  var grid = document.getElementById('posts-grid');
  if (!grid) return;

  fetch('posts.json?v=' + Date.now(), { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Could not load posts.json');
      }
      return response.json();
    })
    .then(function (posts) {
      if (!Array.isArray(posts) || !posts.length) {
        grid.innerHTML =
          '<p class="posts-empty">No articles available right now.</p>';
        return;
      }

      grid.innerHTML = '';

      posts.forEach(function (post) {
        var card = document.createElement('a');
        card.className = 'post-card';
        card.href = post.link || '#';

        var imageWrap = document.createElement('div');
        imageWrap.className = 'post-card-image';

        if (post.image) {
          var image = document.createElement('img');
          image.src = post.image;
          image.alt = post.title || 'Sub Culture article';
          image.loading = 'lazy';
          imageWrap.appendChild(image);
        }

        var date = document.createElement('div');
        date.className = 'post-card-date';
        date.textContent = post.date || '';

        var title = document.createElement('h3');
        title.textContent = post.title || '';

        var excerpt = document.createElement('p');
        excerpt.textContent = post.excerpt || '';

        card.appendChild(imageWrap);
        card.appendChild(date);
        card.appendChild(title);
        card.appendChild(excerpt);

        grid.appendChild(card);
      });
    })
    .catch(function (error) {
      console.error('Sub Culture articles failed to load:', error);
      grid.innerHTML =
        '<p class="posts-empty">Articles could not be loaded right now. Please refresh the page.</p>';
    });
});
