/* ============================================================
   chatbot-widget.js — Sub Culture site assistant
   Drop this one line before </body> on any page:
     <script src="chatbot-widget.js"></script>

   Before this works, set WORKER_URL below to your deployed
   Cloudflare Worker's URL (see cloudflare-worker.js for the
   deploy steps). Nothing else needs to change per-page — same
   pattern as player.js.

   Positioned bottom-LEFT so it never collides with the sticky
   mix player, which lives bottom-right/bottom-fixed.
   ============================================================ */
(function () {
  "use strict";

  // ---- REQUIRED: set this to your deployed Worker's URL ----
  var WORKER_URL = "https://sub-culture-chat.YOUR-SUBDOMAIN.workers.dev";
  // ------------------------------------------------------------

  var SESSION_KEY = "scb_chat_history_v1";

  function loadHistory() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveHistory(h) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(h.slice(-20))); }
    catch (e) {}
  }

  function injectStyle() {
    var css = ''
      + '#scb-launch{position:fixed;left:1rem;bottom:4.5rem;z-index:9997;'
      + 'width:52px;height:52px;border-radius:50%;background:#111;color:#f4f2ee;'
      + 'border:none;cursor:pointer;box-shadow:0 3px 14px rgba(0,0,0,.3);'
      + 'display:flex;align-items:center;justify-content:center;font-size:1.4rem;}'
      + '#scb-launch:hover{opacity:.85;}'
      + '#scb-panel{position:fixed;left:1rem;bottom:4.5rem;z-index:9997;'
      + 'width:min(340px,calc(100vw - 2rem));height:min(460px,calc(100vh - 7rem));'
      + 'background:#fff;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.25);'
      + 'display:none;flex-direction:column;overflow:hidden;'
      + 'font-family:"Work Sans",sans-serif;}'
      + '#scb-panel.open{display:flex;}'
      + '#scb-head{background:#111;color:#f4f2ee;padding:.85rem 1rem;'
      + 'display:flex;align-items:center;justify-content:space-between;flex:0 0 auto;}'
      + '#scb-head strong{font-family:"Anton",sans-serif;letter-spacing:.02em;font-size:.95rem;font-weight:400;}'
      + '#scb-head span.sub{display:block;font-size:.7rem;opacity:.6;margin-top:1px;}'
      + '#scb-close{background:none;border:none;color:#f4f2ee;font-size:1.3rem;cursor:pointer;line-height:1;}'
      + '#scb-msgs{flex:1 1 auto;overflow-y:auto;padding:.85rem;display:flex;flex-direction:column;gap:.6rem;}'
      + '.scb-msg{max-width:82%;padding:.55rem .75rem;border-radius:10px;font-size:.85rem;line-height:1.45;white-space:pre-wrap;}'
      + '.scb-msg.user{align-self:flex-end;background:#111;color:#f4f2ee;border-bottom-right-radius:2px;}'
      + '.scb-msg.bot{align-self:flex-start;background:#f0efec;color:#111;border-bottom-left-radius:2px;}'
      + '.scb-msg.typing{opacity:.55;font-style:italic;}'
      + '#scb-form{flex:0 0 auto;display:flex;border-top:1px solid #eee;}'
      + '#scb-input{flex:1;border:none;padding:.75rem .85rem;font-size:.85rem;font-family:inherit;outline:none;}'
      + '#scb-send{border:none;background:#111;color:#f4f2ee;padding:0 1rem;cursor:pointer;font-size:.8rem;}'
      + '#scb-send:disabled{opacity:.4;cursor:default;}'
      + '#scb-err{padding:.5rem .85rem;font-size:.75rem;color:#b3122b;display:none;}'
      + '@media(max-width:480px){#scb-launch{left:.75rem;bottom:4.25rem;}#scb-panel{left:.75rem;bottom:4rem;}}';
    var tag = document.createElement("style");
    tag.id = "scb-style";
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function build() {
    var launch = document.createElement("button");
    launch.id = "scb-launch";
    launch.setAttribute("aria-label", "Chat with Sub Culture");
    launch.textContent = "\uD83D\uDCAC";
    document.body.appendChild(launch);

    var panel = document.createElement("div");
    panel.id = "scb-panel";
    panel.innerHTML =
      '<div id="scb-head">' +
        '<div><strong>Sub Culture</strong><span class="sub">Ask about articles, mixes, whatever</span></div>' +
        '<button id="scb-close" aria-label="Close chat">&times;</button>' +
      '</div>' +
      '<div id="scb-msgs"></div>' +
      '<p id="scb-err"></p>' +
      '<form id="scb-form">' +
        '<input id="scb-input" type="text" placeholder="Type a message\u2026" autocomplete="off">' +
        '<button id="scb-send" type="submit">Send</button>' +
      '</form>';
    document.body.appendChild(panel);

    var msgsEl = document.getElementById("scb-msgs");
    var form = document.getElementById("scb-form");
    var input = document.getElementById("scb-input");
    var sendBtn = document.getElementById("scb-send");
    var errEl = document.getElementById("scb-err");

    var history = loadHistory();

    function renderAll() {
      msgsEl.innerHTML = "";
      if (!history.length) {
        appendBubble("bot", "Hey \u2014 ask me about anything on the site: articles, free downloads, the daily trivia, whatever.");
      } else {
        history.forEach(function (m) { appendBubble(m.role === "user" ? "user" : "bot", m.content); });
      }
    }

    function appendBubble(kind, text) {
      var b = document.createElement("div");
      b.className = "scb-msg " + kind;
      b.textContent = text;
      msgsEl.appendChild(b);
      msgsEl.scrollTop = msgsEl.scrollHeight;
      return b;
    }

    launch.addEventListener("click", function () {
      panel.classList.add("open");
      launch.style.display = "none";
      if (!history.length) renderAll();
      input.focus();
    });
    document.getElementById("scb-close").addEventListener("click", function () {
      panel.classList.remove("open");
      launch.style.display = "flex";
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      errEl.style.display = "none";

      appendBubble("user", text);
      history.push({ role: "user", content: text });
      saveHistory(history);
      input.value = "";
      input.disabled = true;
      sendBtn.disabled = true;

      var typingBubble = appendBubble("bot typing", "\u2026");

      fetch(WORKER_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("bad status " + r.status);
          return r.json();
        })
        .then(function (data) {
          typingBubble.remove();
          var reply = data.reply || "Sorry, something went wrong on my end.";
          appendBubble("bot", reply);
          history.push({ role: "assistant", content: reply });
          saveHistory(history);
        })
        .catch(function () {
          typingBubble.remove();
          errEl.textContent = "Couldn't reach the chat right now \u2014 try again in a moment.";
          errEl.style.display = "block";
        })
        .finally(function () {
          input.disabled = false;
          sendBtn.disabled = false;
          input.focus();
        });
    });

    renderAll();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!WORKER_URL || WORKER_URL.indexOf("YOUR-SUBDOMAIN") !== -1) {
      console.warn("Sub Culture chat widget: set WORKER_URL in chatbot-widget.js before this will work.");
      return;
    }
    injectStyle();
    build();
  });
})();
