"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

interface ScreenProtectionProps {
  role: string | null | undefined;
}

export function ScreenProtection({ role }: ScreenProtectionProps) {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    // Only apply for students, or if role is missing (fail-secure)
    if (role === "admin") return;

    // POLICY: Screenshots are ALLOWED for students. Screenshot keys
    // (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5) must never lock the account.
    // Only content-extraction and DevTools shortcuts are blocked below.

    // 1. Prevent Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Prevent Keyboard Shortcuts (DevTools, Print, Copy/Paste) —
    // screenshot keys are deliberately NOT handled here.
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12
      if (e.key === "F12") {
        e.preventDefault();
      }
      
      // Prevent Ctrl+Shift+I / Cmd+Option+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
      }
      
      // Prevent Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
      }
      
      // Prevent Ctrl+Shift+J / Cmd+Option+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "J" || e.key === "j")) {
        e.preventDefault();
      }
      
      // Prevent Ctrl+U / Cmd+Option+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
      }
      
      // Prevent Print (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
      }
      
      // Prevent Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && (e.key === "C" || e.key === "c")) {
        // Just blocking it for extra measure
        e.preventDefault();
      }

      // Screenshots (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5) are allowed —
      // do NOT preventDefault or lock the account for them.
    };

    // 3. Prevent Copy/Cut events entirely
    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      // Try to overwrite whatever they copied
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
      }
    };

    // 4. Blur screen when window loses focus
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };
    
    // Add CSS properties securely
    const styleId = "bimpacc-protection-styles";
    let style = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        body {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          touch-action: manipulation;
        }
        iframe {
          pointer-events: none !important;
          -webkit-touch-callout: none !important;
        }
        @media print {
          html, body {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    document.addEventListener("copy", handleCopyCut);
    document.addEventListener("cut", handleCopyCut); // Reuse same logic for cut
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    const handleWindowBlur = () => setIsBlurred(true);
    const handleWindowFocus = () => setIsBlurred(false);
    
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopyCut);
      document.removeEventListener("cut", handleCopyCut);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [role]);

  if (role === "admin") return null;

  return (
    <>
      {isBlurred && (
        <div className="fixed inset-0 z-[99999] bg-background/95 backdrop-blur-3xl flex items-center justify-center flex-col gap-6 p-4 text-center select-none">
          <div className="bg-destructive/10 text-destructive p-4 rounded-full">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-foreground text-2xl font-bold tracking-tight">Content Paused</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              For security and copyright reasons, the content is hidden while this window is out of focus. Please click here to resume viewing.
            </p>
          </div>
          <button 
            onClick={() => setIsBlurred(false)}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Resume Learning
          </button>
        </div>
      )}
    </>
  );
}
