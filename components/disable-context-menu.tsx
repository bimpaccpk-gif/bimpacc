"use client";

import { useEffect } from "react";

export function DisableContextMenu() {
  useEffect(() => {
    const _stopImmediate = Event.prototype.stopImmediatePropagation;

    // Check if target is a form element where we should allow normal behavior
    const isFormEl = (el: EventTarget | null): boolean => {
      if (!el || !(el as HTMLElement).tagName) return false;
      const tag = (el as HTMLElement).tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || tag === "button" || (el as HTMLElement).isContentEditable;
    };

    const killMenu = (e: MouseEvent) => {
      // Allow dropdown menus to work
      const target = e.target as HTMLElement;
      if (target.closest('[data-slot="dropdown-menu-trigger"]') || 
          target.closest('[data-slot="dropdown-menu-content"]') ||
          target.closest('[data-slot="dropdown-menu"]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      _stopImmediate.call(e);
      (e as any).returnValue = false;
      return false;
    };

    const killCopy = (e: ClipboardEvent) => {
      if (isFormEl(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      _stopImmediate.call(e);
      (e as any).returnValue = false;
      return false;
    };

    const killKey = (e: KeyboardEvent) => {
      const isForm = isFormEl(e.target);

      // Ctrl+C — copy (block outside forms)
      if (e.ctrlKey && e.key === "c" && !isForm) { e.preventDefault(); _stopImmediate.call(e); return; }
      // Ctrl+X — cut (block outside forms)
      if (e.ctrlKey && e.key === "x" && !isForm) { e.preventDefault(); _stopImmediate.call(e); return; }
      // Ctrl+A — select all (block outside forms)
      if (e.ctrlKey && e.key === "a" && !isForm) { e.preventDefault(); _stopImmediate.call(e); return; }
      // Ctrl+S — save page
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); _stopImmediate.call(e); return; }
      // Ctrl+P — print
      if (e.ctrlKey && e.key === "p") { e.preventDefault(); _stopImmediate.call(e); return; }
      // F12
      if (e.key === "F12") { e.preventDefault(); _stopImmediate.call(e); return; }
      // Ctrl+Shift+I / J / C
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) {
        e.preventDefault(); _stopImmediate.call(e); return;
      }
      // Ctrl+U — view source
      if (e.ctrlKey && e.key === "u") { e.preventDefault(); _stopImmediate.call(e); return; }
      // Shift+F10
      if (e.shiftKey && e.key === "F10") { e.preventDefault(); _stopImmediate.call(e); return; }
      // ContextMenu key
      if (e.key === "ContextMenu") { e.preventDefault(); _stopImmediate.call(e); return; }
    };

    const killMiddle = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        _stopImmediate.call(e);
        return false;
      }
    };

    const killDrag = (e: DragEvent) => {
      if (isFormEl(e.target)) return;
      e.preventDefault();
      _stopImmediate.call(e);
      return false;
    };

    const killSelect = (e: Event) => {
      if (isFormEl(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Attach at document level with capture + non-passive
    document.addEventListener("contextmenu", killMenu, { capture: true, passive: false });
    document.addEventListener("copy", killCopy, { capture: true, passive: false });
    document.addEventListener("cut", killCopy, { capture: true, passive: false });
    document.addEventListener("dragstart", killDrag, { capture: true, passive: false });
    document.addEventListener("selectstart", killSelect, { capture: true, passive: false });
    document.addEventListener("keydown", killKey, { capture: true });
    document.addEventListener("mousedown", killMiddle, { capture: true });
    // Re-attach every 300ms to counter extension removal
    const interval = setInterval(() => {
      document.removeEventListener("contextmenu", killMenu, true);
      document.removeEventListener("copy", killCopy, true);
      document.removeEventListener("cut", killCopy, true);
      document.addEventListener("contextmenu", killMenu, { capture: true, passive: false });
      document.addEventListener("copy", killCopy, { capture: true, passive: false });
      document.addEventListener("cut", killCopy, { capture: true, passive: false });
    }, 300);

    return () => {
      document.removeEventListener("contextmenu", killMenu, true);
      document.removeEventListener("copy", killCopy, true);
      document.removeEventListener("cut", killCopy, true);
      document.removeEventListener("dragstart", killDrag, true);
      document.removeEventListener("selectstart", killSelect, true);
      document.removeEventListener("keydown", killKey, true);
      document.removeEventListener("mousedown", killMiddle, true);
      clearInterval(interval);
    };
  }, []);

  return null;
}
