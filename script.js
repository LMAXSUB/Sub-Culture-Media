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
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  var postsGrid = document.getElementById('posts-grid');
  if (postsGrid) {
    fetch('posts.json')
      .then(function (res) { return res.json(); })
      .then(function (posts) {
        if (!posts || posts.length === 0) {
          postsGrid.innerHTML = '<p class="posts-empty">No articles yet — check back soon.</p>';
          return;
        }

        posts.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

        postsGrid.innerHTML = posts.map(function (post) {
          var dateLabel = new Date(post.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            '<a class="post-card" href="' + (post.link || '#') + '">' +
              '<div class="post-card-image"><img src="' + post.image + '" alt="' + post.title + '" loading="lazy"></div>' +
              '<span class="post-card-date">' + dateLabel + '</span>' +
              '<h3>' + post.title + '</h3>' +
              '<p>' + post.excerpt + '</p>' +
            '</a>'
          );
        }).join('');
      })
      .catch(function () {
        postsGrid.innerHTML = '<p class="posts-empty">Couldn\'t load articles right now.</p>';
      });
  }

  var downloadsGrid = document.getElementById('downloads-grid');
  if (downloadsGrid) {
    fetch('downloads.json')
      .then(function (res) { return res.json(); })
      .then(function (items) {
        if (!items || items.length === 0) {
          downloadsGrid.innerHTML = '<p class="posts-empty">No downloads yet — check back soon.</p>';
          return;
        }

        downloadsGrid.innerHTML = items.map(function (item) {
          var typeLabel = item.type === 'mp3' ? 'MP3' : 'Image';
          return (
            '<div class="shop-card">' +
              '<span class="price">' + typeLabel + '</span>' +
              '<h3>' + item.title + '</h3>' +
              '<p>' + item.description + '</p>' +
              '<a class="button" href="' + item.file + '" download>Download</a>' +
            '</div>'
          );
        }).join('');
      })
      .catch(function () {
        downloadsGrid.innerHTML = '<p class="posts-empty">Couldn\'t load downloads right now.</p>';
      });
  }
});
