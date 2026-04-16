"use client";

import { useRef, useEffect, useCallback } from "react";

type UnitStatus = "beschikbaar" | "gereserveerd" | "verkocht" | "coming_soon";

interface AudioUnit {
  id: string;
  status: UnitStatus;
}

const AUDIO_FILES = {
  verkocht:     "/sounds/sale.mp3",
  gereserveerd: "/sounds/reserve.mp3",
};

/**
 * Pre-load een audio-instantie en geef een play()-functie terug.
 * De instantie wordt hergebruikt (geen nieuw object per play), wat
 * browser-autoplay-beleid omzeilt zodra de context eenmaal ontgrendeld is.
 */
function createAudioPlayer(src: string) {
  if (typeof window === "undefined") return { play: () => {}, unlock: () => {} };

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.8;

  return {
    play() {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    },
    /** Speel even af en pauzeer direct – ontgrendelt de browser audio context. */
    unlock() {
      audio.play()
        .then(() => { audio.pause(); audio.currentTime = 0; })
        .catch(() => {});
    },
  };
}

// Module-level cache: src → { play, unlock }
const audioCache = new Map<string, ReturnType<typeof createAudioPlayer>>();

function getPlayer(src: string) {
  if (!audioCache.has(src)) {
    audioCache.set(src, createAudioPlayer(src));
  }
  return audioCache.get(src)!;
}

/**
 * Speelt audio af wanneer een unit van status verandert naar "verkocht" of "gereserveerd".
 *
 * @param units       - Lijst van units met id en status
 * @param muted       - Geluid dempen
 * @param jingleSrc   - Optioneel: vervang de generieke geluiden door één custom jingle
 *                      (bijv. project-specifieke jingle voor 6th Grid)
 */
export function useSaleAudio(units: AudioUnit[], muted = false, jingleSrc?: string) {
  const prevStatusRef   = useRef<Map<string, UnitStatus>>(new Map());
  const initializedRef  = useRef(false);
  const unlockedRef     = useRef(false);

  // Pre-load de audio-bestanden zodra de hook mount
  useEffect(() => {
    if (jingleSrc) {
      getPlayer(jingleSrc);
    } else {
      getPlayer(AUDIO_FILES.verkocht);
      getPlayer(AUDIO_FILES.gereserveerd);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ontgrendel de browser audio context op de eerste klik/toets op de pagina
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    const srcs = jingleSrc
      ? [jingleSrc]
      : [AUDIO_FILES.verkocht, AUDIO_FILES.gereserveerd];
    srcs.forEach((src) => getPlayer(src).unlock());
  }, [jingleSrc]);

  useEffect(() => {
    const opts = { once: true, capture: true } as const;
    document.addEventListener("click",   unlock, opts);
    document.addEventListener("keydown", unlock, opts);
    document.addEventListener("touchstart", unlock, opts);
    return () => {
      document.removeEventListener("click",   unlock, opts);
      document.removeEventListener("keydown", unlock, opts);
      document.removeEventListener("touchstart", unlock, opts);
    };
  }, [unlock]);

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
      // Sla units over die nog niet in prevStatusRef zitten (nieuw toegevoegde units)
      if (prev === undefined) return;

      const toVerkocht     = prev !== "verkocht"     && unit.status === "verkocht";
      const toGereserveerd = prev !== "gereserveerd" && unit.status === "gereserveerd";

      if (toVerkocht || toGereserveerd) {
        if (jingleSrc) {
          getPlayer(jingleSrc).play();
        } else if (toVerkocht) {
          getPlayer(AUDIO_FILES.verkocht).play();
        } else {
          getPlayer(AUDIO_FILES.gereserveerd).play();
        }
      }
    });

    const map = new Map<string, UnitStatus>();
    units.forEach((u) => map.set(u.id, u.status));
    prevStatusRef.current = map;
  }, [units, muted, jingleSrc]);
}
