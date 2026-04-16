"use client";

import { useRef, useEffect } from "react";

type UnitStatus = "beschikbaar" | "gereserveerd" | "verkocht" | "coming_soon";

interface AudioUnit {
  id: string;
  status: UnitStatus;
}

const AUDIO_FILES = {
  verkocht:     "/sounds/sale.mp3",
  gereserveerd: "/sounds/reserve.mp3",
};

function playAudio(src: string) {
  try {
    const audio = new Audio(src);
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch {
    // Audio bestand niet beschikbaar
  }
}

/**
 * Speelt audio af wanneer een unit van status verandert naar "verkocht" of "gereserveerd".
 * @param units       - Lijst van units met id en status
 * @param muted       - Geluid dempen
 * @param jingleSrc   - Optioneel: vervang de generieke geluiden door één custom jingle
 *                      (bijv. project-specifieke jingle voor 6th Grid)
 */
export function useSaleAudio(units: AudioUnit[], muted = false, jingleSrc?: string) {
  const prevStatusRef = useRef<Map<string, UnitStatus>>(new Map());
  const initializedRef = useRef(false);

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
      if (!prev) return;
      const statusChanged =
        (prev !== "verkocht" && unit.status === "verkocht") ||
        (prev !== "gereserveerd" && unit.status === "gereserveerd");
      if (statusChanged) {
        if (jingleSrc) {
          playAudio(jingleSrc);
        } else if (unit.status === "verkocht") {
          playAudio(AUDIO_FILES.verkocht);
        } else {
          playAudio(AUDIO_FILES.gereserveerd);
        }
      }
    });

    const map = new Map<string, UnitStatus>();
    units.forEach((u) => map.set(u.id, u.status));
    prevStatusRef.current = map;
  }, [units, muted, jingleSrc]);
}
