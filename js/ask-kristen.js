/* ============================================================
 *  /js/ask-kristen.js  —  "Ask Kristen" chat widget
 *  Floating bottom-right chat bubble for whymovetodallas.com.
 *  Talks to the AI Search proxy Worker at ENDPOINT (same origin).
 *  Dependency-free. Injected site-wide by build.js.
 * ============================================================ */
(function () {
  "use strict";
  if (window.__askKristenLoaded) return;
  window.__askKristenLoaded = true;

  var ENDPOINT = "/api/ask-kristen"; // Worker route (same origin)

  var GREETING =
    "Hi! I'm Kristen's assistant. Ask me anything about moving to the " +
    "Dallas-Fort Worth suburbs: schools, neighborhoods, commutes, " +
    "cost of living, or the relocation process.";

  var STARTERS = [
    "Which DFW suburbs are best for young families?",
    "How do Frisco ISD and Allen ISD compare?",
    "What should I know about Texas property taxes?",
    "Tell me about new construction in Prosper",
  ];

  // ── Styles (brand: navy #1F2D3D, gold #B08D57, ivory #F7F4EE) ──
  var CSS =
    "#ak-root{--ak-navy:#1F2D3D;--ak-gold:#B08D57;--ak-ivory:#F7F4EE;--ak-stone:#C8C1B6;--ak-char:#232323;" +
    "font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}" +
    "#ak-bubble{position:fixed;bottom:24px;right:24px;width:62px;height:62px;border-radius:50%;background:var(--ak-navy);" +
    "border:2px solid var(--ak-gold);box-sizing:border-box;cursor:pointer;box-shadow:0 6px 22px rgba(31,45,61,.34);z-index:2147483000;display:flex;" +
    "align-items:center;justify-content:center;transition:transform .18s ease,box-shadow .18s ease;padding:0;}" +
    "#ak-bubble:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(31,45,61,.42);}" +
    "#ak-bubble img{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 14%;display:block;}" +
    "#ak-bubble .ak-badge{position:absolute;top:-3px;right:-3px;background:var(--ak-gold);color:#fff;font-size:10px;" +
    "font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;}" +
    "#ak-panel{position:fixed;bottom:96px;right:24px;width:380px;max-width:calc(100vw - 32px);height:560px;" +
    "max-height:calc(100vh - 128px);background:var(--ak-ivory);border-radius:16px;box-shadow:0 18px 50px rgba(31,45,61,.34);" +
    "z-index:2147483000;display:none;flex-direction:column;overflow:hidden;border:1px solid var(--ak-stone);}" +
    "#ak-root.ak-open #ak-panel{display:flex;}" +
    "#ak-root.ak-open #ak-bubble{display:none;}" +
    "#ak-head{background:var(--ak-navy);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px;}" +
    "#ak-head .ak-avatar{width:40px;height:40px;border-radius:50%;background:var(--ak-gold);flex-shrink:0;" +
    "object-fit:cover;object-position:50% 12%;border:1.5px solid rgba(255,255,255,.35);}" +
    "#ak-head .ak-title{font-size:15px;font-weight:600;line-height:1.2;}" +
    "#ak-head .ak-sub{font-size:11.5px;opacity:.82;margin-top:2px;}" +
    "#ak-close{margin-left:auto;background:rgba(255,255,255,.16);border:none;color:#fff;cursor:pointer;opacity:.95;" +
    "width:30px;height:30px;padding:0;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}" +
    "#ak-close:hover{opacity:1;background:rgba(255,255,255,.30);}" +
    "#ak-close svg{width:17px;height:17px;display:block;}" +
    "#ak-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}" +
    ".ak-msg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;}" +
    ".ak-bot{background:#fff;color:var(--ak-char);border:1px solid var(--ak-stone);border-bottom-left-radius:4px;align-self:flex-start;}" +
    ".ak-user{background:var(--ak-navy);color:#fff;border-bottom-right-radius:4px;align-self:flex-end;}" +
    ".ak-msg a{color:var(--ak-gold);font-weight:600;}" +
    ".ak-user a{color:#fff;}" +
    "#ak-starters{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 8px;}" +
    ".ak-chip{background:#fff;border:1px solid var(--ak-stone);color:var(--ak-navy);font-size:12.5px;padding:7px 11px;" +
    "border-radius:16px;cursor:pointer;text-align:left;line-height:1.3;font-family:inherit;transition:background .15s,border-color .15s;}" +
    ".ak-chip:hover{background:var(--ak-ivory);border-color:var(--ak-gold);}" +
    ".ak-typing{display:inline-flex;gap:4px;align-items:center;}" +
    ".ak-typing span{width:7px;height:7px;border-radius:50%;background:var(--ak-gold);opacity:.55;animation:ak-blink 1.2s infinite;}" +
    ".ak-typing span:nth-child(2){animation-delay:.2s;}.ak-typing span:nth-child(3){animation-delay:.4s;}" +
    "@keyframes ak-blink{0%,80%,100%{opacity:.3;transform:translateY(0);}40%{opacity:1;transform:translateY(-3px);}}" +
    "#ak-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--ak-stone);background:var(--ak-ivory);}" +
    "#ak-input{flex:1;resize:none;border:1px solid var(--ak-stone);border-radius:10px;padding:10px 12px;font-size:14px;" +
    "font-family:inherit;color:var(--ak-char);background:#fff;max-height:96px;line-height:1.4;}" +
    "#ak-input:focus{outline:none;border-color:var(--ak-gold);box-shadow:0 0 0 2px rgba(176,141,87,.2);}" +
    "#ak-send{background:var(--ak-gold);border:none;border-radius:10px;width:42px;flex-shrink:0;cursor:pointer;display:flex;" +
    "align-items:center;justify-content:center;transition:background .15s;}" +
    "#ak-send:hover{background:#9d7c4b;}#ak-send:disabled{opacity:.5;cursor:default;}" +
    "#ak-send svg{width:20px;height:20px;}" +
    "#ak-cta{display:block;margin:10px 12px 4px;text-align:center;background:var(--ak-navy);color:#fff;text-decoration:none;" +
    "font-size:13px;font-weight:600;padding:11px 12px;border-radius:10px;transition:background .15s;}" +
    "#ak-cta:hover{background:#16212e;}" +
    "#ak-foot{font-size:10.5px;color:#7c766c;text-align:center;padding:4px 12px 10px;background:var(--ak-ivory);}" +
    "@media(max-width:480px){#ak-panel{bottom:0;right:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0;border:none;}" +
    "#ak-bubble{bottom:18px;right:18px;}}" +
    "@media(prefers-reduced-motion:reduce){#ak-bubble,.ak-typing span{transition:none;animation:none;}}";

  var ICON_CHAT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#B08D57" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5z"/></svg>';
  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  var ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  var messages = []; // {role, content} — conversation history sent to Worker
  var sending = false;
  var root, log, input, sendBtn, startersEl;

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // Escape, then linkify emails, phone numbers, and bare URLs.
  function format(text) {
    var html = escapeHtml(text);
    html = html.replace(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, '<a href="mailto:$1">$1</a>');
    html = html.replace(/(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g, function (m) {
      return '<a href="tel:' + m.replace(/[^\d]/g, "") + '">' + m + "</a>";
    });
    html = html.replace(/\bhttps?:\/\/[^\s<]+/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + "</a>";
    });
    return html;
  }

  function addMsg(role, text) {
    var node = el("div", { class: "ak-msg " + (role === "user" ? "ak-user" : "ak-bot") });
    node.innerHTML = text ? format(text) : "";
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function showTyping() {
    var node = el("div", { class: "ak-msg ak-bot" },
      '<span class="ak-typing"><span></span><span></span><span></span></span>');
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  function setStartersVisible(v) {
    if (startersEl) startersEl.style.display = v ? "flex" : "none";
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    setStartersVisible(false);

    addMsg("user", text);
    messages.push({ role: "user", content: text });
    input.value = "";
    input.style.height = "auto";

    var typingNode = showTyping();
    var botNode = null;
    var answer = "";

    function ensureBot() {
      if (!botNode) {
        if (typingNode && typingNode.parentNode) typingNode.parentNode.removeChild(typingNode);
        botNode = addMsg("bot", "");
      }
    }

    try {
      var res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages }),
      });

      var ctype = res.headers.get("Content-Type") || "";
      if (!res.ok || ctype.indexOf("text/event-stream") === -1) {
        // Error path — Worker returns JSON
        var errBody = {};
        try { errBody = await res.json(); } catch (e) {}
        ensureBot();
        botNode.innerHTML = format(
          errBody.error ||
          "Sorry, I couldn't reach the assistant just now. Please email Kristen@whymovetodallas.com or call (602) 405-4115."
        );
        return;
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";

      // Parse a single SSE line and append any content delta to the answer.
      function handleLine(rawLine) {
        var line = rawLine.trim();
        if (!line || line.indexOf("data:") !== 0) return;
        var data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          var obj = JSON.parse(data);
          var delta = obj && obj.choices && obj.choices[0] && obj.choices[0].delta;
          if (delta && typeof delta.content === "string") {
            answer += delta.content;
            ensureBot();
            botNode.innerHTML = format(answer);
            log.scrollTop = log.scrollHeight;
          }
        } catch (e) { /* ignore non-JSON (e.g. the chunks event) */ }
      }

      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });

        var parts = buffer.split("\n");
        buffer = parts.pop(); // keep the last (possibly partial) line
        for (var i = 0; i < parts.length; i++) handleLine(parts[i]);
      }

      // Flush anything left in the buffer after the stream closes —
      // otherwise a final token with no trailing newline gets dropped.
      buffer += decoder.decode();
      var tail = buffer.split("\n");
      for (var t = 0; t < tail.length; t++) handleLine(tail[t]);

      if (!answer) {
        ensureBot();
        botNode.innerHTML = format(
          "I'm not certain I have that on the site yet. Kristen can help directly: Kristen@whymovetodallas.com or (602) 405-4115."
        );
      } else {
        messages.push({ role: "assistant", content: answer });
      }
    } catch (e) {
      ensureBot();
      botNode.innerHTML = format(
        "Sorry, something went wrong. Please email Kristen@whymovetodallas.com or call (602) 405-4115."
      );
    } finally {
      if (typingNode && typingNode.parentNode) typingNode.parentNode.removeChild(typingNode);
      sending = false;
      sendBtn.disabled = false;
      log.scrollTop = log.scrollHeight;
    }
  }

  function open() {
    root.classList.add("ak-open");
    setTimeout(function () { input && input.focus(); }, 60);
  }
  function close() {
    root.classList.remove("ak-open");
  }

  function build() {
    var style = el("style"); style.textContent = CSS;
    document.head.appendChild(style);

    root = el("div", { id: "ak-root" });

    var bubble = el("button", {
      id: "ak-bubble", "aria-label": "Open Ask Kristen chat", type: "button",
    }, '<img src="/images/kristen-headshot-01.webp" alt="Kristen Carpentier" /><span class="ak-badge">1</span>');
    bubble.addEventListener("click", open);

    var panel = el("div", { id: "ak-panel", role: "dialog", "aria-label": "Ask Kristen chat", "aria-modal": "false" });

    var head = el("div", { id: "ak-head" },
      '<img class="ak-avatar" src="/images/kristen-headshot-01.webp" alt="Kristen Carpentier" />' +
      '<div><div class="ak-title">Ask Kristen</div>' +
      '<div class="ak-sub">DFW family relocation guide</div></div>');
    var closeBtn = el("button", { id: "ak-close", "aria-label": "Minimize chat", title: "Minimize", type: "button" }, ICON_CLOSE);
    closeBtn.addEventListener("click", close);
    head.appendChild(closeBtn);

    log = el("div", { id: "ak-log", role: "log", "aria-live": "polite" });

    startersEl = el("div", { id: "ak-starters" });
    STARTERS.forEach(function (q) {
      var chip = el("button", { class: "ak-chip", type: "button" }, escapeHtml(q));
      chip.addEventListener("click", function () { send(q); });
      startersEl.appendChild(chip);
    });

    var form = el("form", { id: "ak-form" });
    input = el("textarea", {
      id: "ak-input", rows: "1", placeholder: "Ask about DFW suburbs, schools…",
      "aria-label": "Type your question",
    });
    input.addEventListener("input", function () {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 96) + "px";
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); }
    });
    sendBtn = el("button", { id: "ak-send", type: "submit", "aria-label": "Send" }, ICON_SEND);
    form.appendChild(input); form.appendChild(sendBtn);
    form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });

    var cta = el("a", { id: "ak-cta", href: "/get-started" },
      "Get personalized help from Kristen →");

    var foot = el("div", { id: "ak-foot" },
      "AI assistant · may be imperfect. Kristen Carpentier, REALTOR® · eXp Realty");

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(startersEl);
    panel.appendChild(form);
    panel.appendChild(cta);
    panel.appendChild(foot);

    root.appendChild(bubble);
    root.appendChild(panel);
    document.body.appendChild(root);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("ak-open")) close();
    });

    addMsg("bot", GREETING);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
