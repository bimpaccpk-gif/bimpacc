/**
 * Context menu & content protection — runs BEFORE any extension.
 * Counters "right click enabler" extensions by:
 * 1. Saving native preventDefault before extensions load
 * 2. Patching Event.prototype to force-block regardless of extension overrides
 * 3. Using stopImmediatePropagation to prevent extension handlers from firing
 */
(function () {
  var _preventDefault = Event.prototype.preventDefault;
  var _stopImmediate = Event.prototype.stopImmediatePropagation;

  var origPD = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function () {
    origPD.call(this);
    if (this.type === "contextmenu" || this.type === "copy" || this.type === "cut" || this.type === "dragstart") {
      _stopImmediate.call(this);
      this.returnValue = false;
    }
  };

  function isFormEl(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || tag === "button" || el.isContentEditable;
  }

  function killMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.returnValue = false;
    return false;
  }

  function killCopy(e) {
    if (isFormEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.returnValue = false;
    return false;
  }

  function killKey(e) {
    var isForm = isFormEl(e.target);
    if (e.ctrlKey && e.key === "c" && !isForm) { e.preventDefault(); _stopImmediate.call(e); return; }
    if (e.ctrlKey && e.key === "x" && !isForm) { e.preventDefault(); _stopImmediate.call(e); return; }
    if (e.ctrlKey && e.key === "a" && !isForm) { e.preventDefault(); _stopImmediate.call(e); return; }
    if (e.ctrlKey && e.key === "s") { e.preventDefault(); _stopImmediate.call(e); return; }
    if (e.ctrlKey && e.key === "p") { e.preventDefault(); _stopImmediate.call(e); return; }
    if (e.key === "F12") { e.preventDefault(); _stopImmediate.call(e); return; }
    if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) {
      e.preventDefault(); _stopImmediate.call(e); return;
    }
    if (e.ctrlKey && e.key === "u") { e.preventDefault(); _stopImmediate.call(e); return; }
    if (e.shiftKey && e.key === "F10") { e.preventDefault(); _stopImmediate.call(e); return; }
    if (e.key === "ContextMenu") { e.preventDefault(); _stopImmediate.call(e); return; }
  }

  function killMiddle(e) {
    if (e.button === 1) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return false; }
  }

  function killDrag(e) {
    if (isFormEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }

  function killSelect(e) {
    if (isFormEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  function killTouch(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }

  function attachAll() {
    document.addEventListener("contextmenu", killMenu, { capture: true, passive: false });
    document.addEventListener("copy", killCopy, { capture: true, passive: false });
    document.addEventListener("cut", killCopy, { capture: true, passive: false });
    document.addEventListener("dragstart", killDrag, { capture: true, passive: false });
    document.addEventListener("selectstart", killSelect, { capture: true, passive: false });
    document.addEventListener("keydown", killKey, { capture: true });
    document.addEventListener("mousedown", killMiddle, { capture: true });
    document.addEventListener("touchstart", killTouch, { capture: true, passive: false });
    window.addEventListener("contextmenu", killMenu, { capture: true, passive: false });
    window.addEventListener("copy", killCopy, { capture: true, passive: false });
    window.addEventListener("cut", killCopy, { capture: true, passive: false });
    window.addEventListener("keydown", killKey, { capture: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachAll);
  } else {
    attachAll();
  }

  setInterval(function () {
    var events = ["contextmenu", "copy", "cut"];
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var fn = ev === "contextmenu" ? killMenu : killCopy;
      document.removeEventListener(ev, fn, true);
      window.removeEventListener(ev, fn, true);
      document.addEventListener(ev, fn, { capture: true, passive: false });
      window.addEventListener(ev, fn, { capture: true, passive: false });
    }
  }, 500);

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var nodes = mutations[i].addedNodes;
      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];
        if (node.nodeType === 1) {
          node.addEventListener("contextmenu", killMenu, { capture: true, passive: false });
          node.addEventListener("copy", killCopy, { capture: true, passive: false });
          node.addEventListener("cut", killCopy, { capture: true, passive: false });
          node.addEventListener("dragstart", killDrag, { capture: true, passive: false });
          node.addEventListener("selectstart", killSelect, { capture: true, passive: false });
          if (node.querySelectorAll) {
            node.querySelectorAll("*").forEach(function (el) {
              el.addEventListener("contextmenu", killMenu, { capture: true, passive: false });
              el.addEventListener("copy", killCopy, { capture: true, passive: false });
              el.addEventListener("cut", killCopy, { capture: true, passive: false });
              el.addEventListener("dragstart", killDrag, { capture: true, passive: false });
              el.addEventListener("selectstart", killSelect, { capture: true, passive: false });
            });
          }
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  var style = document.createElement("style");
  style.textContent = "img, a, video, audio, svg, canvas { -webkit-user-drag: none !important; user-drag: none !important; }";
  document.head.appendChild(style);
})();
