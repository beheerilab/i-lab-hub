"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Grootte van de sticky hub-header, zodat pop-ups van de tool er niet onder verdwijnen. */
const HEADER_HOOGTE = 96;

/**
 * Binnen de tool: geen eigen scroll-gebied meer, en pop-ups (position:fixed)
 * worden geplaatst op het deel van de tool dat nu op het scherm staat in plaats
 * van op de hele (hoge) pagina.
 */
const TOOL_CSS = `
  html, body { min-height: 0 !important; overflow-y: hidden !important; }
  .modal, #overlay, .overlay, .lightbox {
    inset: auto !important;
    top: var(--vy, 0px) !important;
    left: 0 !important;
    right: 0 !important;
    height: var(--vh, 100vh) !important;
  }
  .sticky {
    bottom: auto !important;
    top: calc(var(--vy, 0px) + var(--vh, 100vh)) !important;
    transform: translateY(-100%) !important;
  }
  .toast {
    bottom: auto !important;
    top: calc(var(--vy, 0px) + var(--vh, 100vh) - 84px) !important;
    transform: translate(-50%, -100%) !important;
  }
  .tablewrap { max-height: calc(var(--pvh, 800px) * .65) !important; }
`;

/**
 * Toont een losse HTML-tool (zie /api/tools/[naam]) als onderdeel van de pagina:
 * het kader groeit mee met de inhoud, dus alleen de hub-pagina scrolt.
 * Breekt bewust uit de smalle paginabreedte (de facturatie-tabellen hebben
 * meer ruimte nodig).
 */
export function ToolFrame({ naam, titel }: { naam: string; titel: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [hoogte, setHoogte] = useState(900);

  const werkBij = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.body) return;

    const stijl = frame.contentWindow!.getComputedStyle(doc.body);
    const inhoud = doc.body.offsetHeight + parseFloat(stijl.marginTop) + parseFloat(stijl.marginBottom);
    const nieuw = Math.max(640, Math.ceil(inhoud));
    setHoogte((h) => (Math.abs(h - nieuw) > 1 ? nieuw : h));

    // Zichtbaar deel van de tool, voor pop-ups.
    const rect = frame.getBoundingClientRect();
    const boven = Math.max(0, HEADER_HOOGTE - rect.top);
    const onder = Math.min(rect.height, window.innerHeight - rect.top);
    const root = doc.documentElement.style;
    root.setProperty("--vy", `${boven}px`);
    root.setProperty("--vh", `${Math.max(240, onder - boven)}px`);
    root.setProperty("--pvh", `${window.innerHeight}px`);
  }, []);

  const bijLaden = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.body) return;

    const stijl = doc.createElement("style");
    stijl.textContent = TOOL_CSS;
    doc.head.appendChild(stijl);

    const observer = new ResizeObserver(werkBij);
    observer.observe(doc.body);
    observer.observe(doc.documentElement);
    werkBij();
  }, [werkBij]);

  useEffect(() => {
    const interval = setInterval(werkBij, 600); // vangt wijzigingen op die geen resize geven
    window.addEventListener("scroll", werkBij, { passive: true });
    window.addEventListener("resize", werkBij);
    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", werkBij);
      window.removeEventListener("resize", werkBij);
    };
  }, [werkBij]);

  return (
    <div className="relative left-1/2 w-[min(100vw-2rem,1300px)] -translate-x-1/2">
      <iframe
        ref={frameRef}
        src={`/api/tools/${naam}`}
        title={titel}
        scrolling="no"
        onLoad={bijLaden}
        style={{ height: hoogte }}
        className="block w-full rounded-2xl border border-border bg-white shadow-card"
      />
    </div>
  );
}
