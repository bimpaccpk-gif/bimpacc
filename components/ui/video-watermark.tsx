"use client";

import { useEffect, useRef, useCallback } from "react";

interface VideoWatermarkProps {
  fullName: string;
  email: string;
  cnicNumber: string | null;
}

export function VideoWatermark({ fullName, email, cnicNumber }: VideoWatermarkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 50, y: 50 });
  const velRef = useRef({ vx: 0.6, vy: 0.4 });
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const parent = container.parentElement;
    if (!parent) return;

    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;

    let { x, y } = posRef.current;
    let { vx, vy } = velRef.current;

    x += vx;
    y += vy;

    if (x <= 0 || x + cw >= pw) {
      vx = -vx;
      x = Math.max(0, Math.min(x, pw - cw));
    }
    if (y <= 0 || y + ch >= ph) {
      vy = -vy;
      y = Math.max(0, Math.min(y, ph - ch));
    }

    posRef.current = { x, y };
    velRef.current = { vx, vy };

    container.style.transform = `translate(${x}px, ${y}px)`;
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  const cnicDisplay = cnicNumber ? `CNIC: ${cnicNumber}` : "";

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute top-0 left-0 z-30 select-none whitespace-nowrap"
      style={{ willChange: "transform" }}
    >
      <div
        className="flex flex-col gap-0.5 rounded-md px-3 py-1.5 text-[11px] font-semibold text-red-500 sm:text-xs"
        style={{ background: "rgba(0,0,0,0.25)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
      >
        <span>{fullName}</span>
        <span>{email}</span>
        {cnicDisplay && <span>{cnicDisplay}</span>}
        <span>bimpacc.com</span>
      </div>
    </div>
  );
}
