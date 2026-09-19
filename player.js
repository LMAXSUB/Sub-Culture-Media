/* ============================================================
   player.js — Sub Culture sticky mix player
   Drop this one line before </body> on any page:
     <script src="player.js"></script>
   It injects its own styles and markup, reads every "mp3" entry
   from downloads.json automatically, and needs no other setup.
   Adding a new mix to downloads.json puts it in the player too —
   nothing else to maintain.
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "scp_player_state_v1";

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveState(patch) {
    try {
      var s = loadState();
      Object.assign(s, patch);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function fmtTime(sec) {
    if (!isFinite(sec)) return "0:00";
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function injectStyle() {
    var css = ''
      + '#scp-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;'
      + 'background:#111;color:#f4f2ee;font-family:"Work Sans",sans-serif;'
      + 'box-shadow:0 -2px 14px rgba(0,0,0,.25);transform:translateY(0);'
      + 'transition:transform .25s ease;}'
      + '#scp-bar.scp-hidden{transform:translateY(100%);}'
      + '#scp-bar .scp-wrap{max-width:1100px;margin:0 auto;display:flex;'
      + 'align-items:center;gap:.85rem;padding:.55rem 1rem;}'
      + '#scp-bar button{background:none;border:none;color:#f4f2ee;cursor:pointer;'
      + 'padding:.3rem;display:flex;align-items:center;justify-content:center;}'
      + '#scp-bar button:hover{opacity:.75;}'
      + '#scp-bar .scp-play{background:#f4f2ee;color:#111;border-radius:50%;'
      + 'width:34px;height:34px;flex:0 0 auto;}'
      + '#scp-meta{min-width:0;flex:1 1 auto;line-height:1.25;overflow:hidden;}'
      + '#scp-title{font-family:"Anton",sans-serif;letter-spacing:.02em;'
      + 'font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
      + '#scp-sub{font-size:.72rem;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
      + '#scp-time{font-size:.72rem;opacity:.6;flex:0 0 auto;min-width:74px;text-align:right;}'
      + '#scp-seek{flex:2 1 140px;-webkit-appearance:none;appearance:none;height:3px;'
      + 'background:rgba(255,255,255,.25);border-radius:2px;outline:none;cursor:pointer;}'
      + '#scp-seek::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;'
      + 'border-radius:50%;background:#f4f2ee;}'
      + '#scp-seek::-moz-range-thumb{width:11px;height:11px;border:none;border-radius:50%;background:#f4f2ee;}'
      + '#scp-close{flex:0 0 auto;opacity:.5;font-size:1.1rem;}'
      + '#scp-launch{position:fixed;right:1rem;bottom:1rem;z-index:9998;background:#111;'
      + 'color:#f4f2ee;border:none;border-radius:999px;padding:.55rem 1rem;font-size:.78rem;'
      + 'font-family:"Work Sans",sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);'
      + 'display:none;align-items:center;gap:.4rem;}'
      + '@media(max-width:640px){#scp-sub{display:none;}#scp-time{min-width:56px;}}'
      + 'body.scp-padded{padding-bottom:56px;}';
    var tag = document.createElement("style");
    tag.id = "scp-style";
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function svg(path) {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">' + path + '</svg>';
  }
  var ICON_PLAY = svg('<path d="M8 5v14l11-7z"/>');
  var ICON_PAUSE = svg('<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>');
  var ICON_PREV = svg('<path d="M6 6h2v12H6zM20 6L10 12l10 6z"/>');
  var ICON_NEXT = svg('<path d="M16 6h2v12h-2zM4 6l10 6-10 6z"/>');

  function build(tracks) {
    var bar = document.createElement("div");
    bar.id = "scp-bar";
    bar.innerHTML =
      '<div class="scp-wrap">' +
        '<button id="scp-prev" aria-label="Previous track">' + ICON_PREV + '</button>' +
        '<button id="scp-playbtn" class="scp-play" aria-label="Play/Pause">' + ICON_PLAY + '</button>' +
        '<button id="scp-next" aria-label="Next track">' + ICON_NEXT + '</button>' +
        '<div id="scp-meta"><div id="scp-title"></div><div id="scp-sub"></div></div>' +
        '<input id="scp-seek" type="range" min="0" max="100" value="0">' +
        '<div id="scp-time">0:00 / 0:00</div>' +
        '<button id="scp-close" aria-label="Close player">&times;</button>' +
      '</div>';
    document.body.appendChild(bar);
    document.body.classList.add("scp-padded");

    var launch = document.createElement("button");
    launch.id = "scp-launch";
    launch.innerHTML = ICON_PLAY + '<span>Sub Culture Mixes</span>';
    document.body.appendChild(launch);

    var audio = new Audio();
    audio.preload = "metadata";

    var state = loadState();
    var idx = 0;
    if (typeof state.trackIndex === "number" && state.trackIndex < tracks.length) {
      idx = state.trackIndex;
    }

    var playBtn = document.getElementById("scp-playbtn");
    var titleEl = document.getElementById("scp-title");
    var subEl = document.getElementById("scp-sub");
    var seek = document.getElementById("scp-seek");
    var timeEl = document.getElementById("scp-time");

    function loadTrack(i, autoplay) {
      idx = ((i % tracks.length) + tracks.length) % tracks.length;
      var t = tracks[idx];
      audio.src = t.file;
      titleEl.textContent = t.title;
      subEl.textContent = t.description || "";
      saveState({ trackIndex: idx, currentTime: 0 });
      if (autoplay) audio.play().catch(function () {});
    }

    loadTrack(idx, false);
    if (typeof state.currentTime === "number" && state.currentTime > 1) {
      audio.addEventListener("loadedmetadata", function once() {
        audio.currentTime = Math.min(state.currentTime, audio.duration - 1 || 0);
        audio.removeEventListener("loadedmetadata", once);
      });
    }

    function setPlayIcon(playing) {
      playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    }

    playBtn.addEventListener("click", function () {
      if (audio.paused) audio.play().catch(function () {});
      else audio.pause();
    });
    document.getElementById("scp-prev").addEventListener("click", function () {
      loadTrack(idx - 1, !audio.paused);
    });
    document.getElementById("scp-next").addEventListener("click", function () {
      loadTrack(idx + 1, !audio.paused);
    });
    audio.addEventListener("play", function () { setPlayIcon(true); });
    audio.addEventListener("pause", function () { setPlayIcon(false); saveState({ currentTime: audio.currentTime }); });
    audio.addEventListener("ended", function () { loadTrack(idx + 1, true); });
    audio.addEventListener("timeupdate", function () {
      if (audio.duration) {
        seek.value = (audio.currentTime / audio.duration) * 100;
        timeEl.textContent = fmtTime(audio.currentTime) + " / " + fmtTime(audio.duration);
        if (Math.floor(audio.currentTime) % 5 === 0) saveState({ currentTime: audio.currentTime });
      }
    });
    seek.addEventListener("input", function () {
      if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
    });

    document.getElementById("scp-close").addEventListener("click", function () {
      audio.pause();
      bar.classList.add("scp-hidden");
      document.body.classList.remove("scp-padded");
      launch.style.display = "flex";
    });
    launch.addEventListener("click", function () {
      bar.classList.remove("scp-hidden");
      document.body.classList.add("scp-padded");
      launch.style.display = "none";
    });

    window.addEventListener("pagehide", function () {
      saveState({ currentTime: audio.currentTime, trackIndex: idx });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    fetch("downloads.json")
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var tracks = (list || []).filter(function (d) { return d.type === "mp3"; });
        if (!tracks.length) return;
        injectStyle();
        build(tracks);
      })
      .catch(function () { /* no downloads.json on this page/path — fail silently */ });
  });
})();
