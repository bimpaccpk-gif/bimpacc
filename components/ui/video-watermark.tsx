"use client";

import { useEffect, useRef } from "react";

interface VideoWatermarkProps {
  fullName: string;
  email: string;
  cnicNumber: string | null;
}

export function VideoWatermark({ fullName, email, cnicNumber }: VideoWatermarkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ vx: 0, vy: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const parent = container.parentElement;
    if (!parent) return;

    const initialParentWidth = parent.clientWidth;
    const initialParentHeight = parent.clientHeight;
    const initialContainerWidth = container.offsetWidth;
    const initialContainerHeight = container.offsetHeight;
    const maxInitialX = Math.max(0, initialParentWidth - initialContainerWidth);
    const maxInitialY = Math.max(0, initialParentHeight - initialContainerHeight);
    const direction = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 0.4;

    posRef.current = {
      x: Math.random() * maxInitialX,
      y: Math.random() * maxInitialY,
    };
    velRef.current = {
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
    };

    container.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
    container.style.opacity = "1";

    let animationFrame = 0;

    function animate() {
      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      const currentParent = currentContainer.parentElement;
      if (!currentParent) return;

      // Read layout first, then update styles once to avoid layout thrashing.
      const pw = currentParent.clientWidth;
      const ph = currentParent.clientHeight;
      const cw = currentContainer.offsetWidth;
      const ch = currentContainer.offsetHeight;

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

      currentContainer.style.transform = `translate(${x}px, ${y}px)`;
      animationFrame = requestAnimationFrame(animate);
    }

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const cnicDisplay = cnicNumber ? `CNIC: ${cnicNumber}` : "";

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute top-0 left-0 z-30 select-none whitespace-nowrap"
      style={{ opacity: 0, willChange: "transform" }}
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
