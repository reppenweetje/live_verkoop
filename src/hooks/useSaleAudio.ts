"use client";

import { useRef, useEffect, useCallback, useState } from "react";

type UnitStatus = "beschikbaar" | "gereserveerd" | "verkocht" | "coming_soon";

interface AudioUnit {
  id: string;
  status: UnitStatus;
}

const AUDIO_FILES = {
  verkocht:     "/sounds/sale.mp3",
  gereserveerd: "/sounds/reserve.mp3",
};

// ─── Web Audio API globals ─────────────────────────────────────────────────────
// Safari iOS vereist dat AudioContext.resume() SYNCHROON wordt aangeroepen
// vanuit een directe user-gesture handler. Na die ene unlock werkt
// programmatische audio (BufferSource.start()) altijd, ook zonder geste.

let _ctx: AudioContext | null = null;
let _ctxUnlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
  }
  return _ctx;
}

/**
 * MOET synchroon worden aangeroepen vanuit een user-gesture event handler.
 * Na deze aanroep is de context "running" en werkt audio altijd.
 */
function unlockCtxSync(): boolean {
  if (_ctxUnlocked) return true;
  const ctx = getCtx();
  if (!ctx) return false;

  // Synchrone aanroep – geen await, anders herkent Safari het niet als user gesture
  ctx.resume();

  // Speel een stil geluid af via HTML Audio om ook de "legacy" audio-poort te ontgrendelen
  try {
    const silent = new Audio(
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
    );
    silent.volume = 0;
    silent.play().catch(() => {});
  } catch { /* ignore */ }

  _ctxUnlocked = true;
  return true;
}

// ─── Buffer cache ─────────────────────────────────────────────────────────────

const _buffers = new Map<string, AudioBuffer | "loading" | "error">();
const _loadPromises = new Map<string, Promise<AudioBuffer | null>>();

function loadBuffer(src: string): Promise<AudioBuffer | null> {
  const cached = _buffers.get(src);
  if (cached && cached !== "loading") {
    return Promise.resolve(cached === "error" ? null : cached as AudioBuffer);
  }
  if (_loadPromises.has(src)) return _loadPromises.get(src)!;

  _buffers.set(src, "loading");
  const promise = (async () => {
    try {
      const ctx = getCtx();
      if (!ctx) return null;
      const res = await fetch(src);
      const ab  = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      _buffers.set(src, buf);
      return buf;
    } catch {
      _buffers.set(src, "error");
      return null;
    }
  })();
  _loadPromises.set(src, promise);
  return promise;
}

function playBuffer(buf: AudioBuffer) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state !== "running") {
      // Probeer alsnog te resumeren (werkt mogelijk als context kort suspended raakte)
      ctx.resume();
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
}

async function playSrc(src: string) {
  const buf = await loadBuffer(src);
  if (buf) playBuffer(buf);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface SaleAudioResult {
  /** True nadat de gebruiker de audio heeft ingeschakeld */
  audioUnlocked: boolean;
  /** Roep dit aan op een directe tap/click om iOS audio te ontgrendelen */
  manualUnlock: () => void;
}

/**
 * Speelt audio af wanneer een unit van status verandert naar "verkocht" of
 * "gereserveerd". Werkt ook op iPad Safari via de Web Audio API.
 *
 * BELANGRIJK: op iOS moet de gebruiker één keer `manualUnlock()` aanroepen
 * vanuit een directe tap/click handler voordat audio automatisch werkt.
 *
 * @param units      - Lijst van units met id en status
 * @param muted      - Geluid dempen
 * @param jingleSrc  - Optioneel: speel deze jingle i.p.v. generieke geluiden
 */
export function useSaleAudio(
  units: AudioUnit[],
  muted = false,
  jingleSrc?: string
): SaleAudioResult {
  const prevStatusRef  = useRef<Map<string, UnitStatus>>(new Map());
  const initializedRef = useRef(false);
  const [audioUnlocked, setAudioUnlocked] = useState(() => _ctxUnlocked);

  // Pre-load audiobuffers zodra de hook mount
  useEffect(() => {
    getCtx(); // initialiseer AudioContext alvast (state: suspended)
    if (jingleSrc) {
      loadBuffer(jingleSrc);
    } else {
      loadBuffer(AUDIO_FILES.verkocht);
      loadBuffer(AUDIO_FILES.gereserveerd);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Expliciet ontgrendelen vanuit een directe user tap. */
  const manualUnlock = useCallback(() => {
    if (_ctxUnlocked) return;
    unlockCtxSync();
    setAudioUnlocked(true);
  }, []);

  // Ook ontgrendelen op elke andere user-interactie met de pagina
  useEffect(() => {
    const handler = () => {
      if (_ctxUnlocked) return;
      unlockCtxSync();
      setAudioUnlocked(true);
    };
    const opts = { capture: true, once: true } as AddEventListenerOptions;
    document.addEventListener("click",      handler, opts);
    document.addEventListener("touchstart", handler, opts);
    document.addEventListener("pointerdown", handler, opts);
    document.addEventListener("keydown",    handler, opts);
    return () => {
      document.removeEventListener("click",      handler, opts);
      document.removeEventListener("touchstart", handler, opts);
      document.removeEventListener("pointerdown", handler, opts);
      document.removeEventListener("keydown",    handler, opts);
    };
  }, []);

  // Detecteer status-wijzigingen en speel audio
  useEffect(() => {
    if (!initializedRef.current) {
      const map = new Map<string, UnitStatus>();
      units.forEach((u) => map.set(u.id, u.status));
      prevStatusRef.current = map;
      initializedRef.current = true;
      return;
    }
    if (muted) return;

    units.forEach((unit) => {
      const prev = prevStatusRef.current.get(unit.id);
      if (prev === undefined) return;

      const toVerkocht     = prev !== "verkocht"     && unit.status === "verkocht";
      const toGereserveerd = prev !== "gereserveerd" && unit.status === "gereserveerd";

      if (toVerkocht || toGereserveerd) {
        if (jingleSrc) {
          playSrc(jingleSrc);
        } else if (toVerkocht) {
          playSrc(AUDIO_FILES.verkocht);
        } else {
          playSrc(AUDIO_FILES.gereserveerd);
        }
      }
    });

    const map = new Map<string, UnitStatus>();
    units.forEach((u) => map.set(u.id, u.status));
    prevStatusRef.current = map;
  }, [units, muted, jingleSrc]);

  return { audioUnlocked, manualUnlock };
}
