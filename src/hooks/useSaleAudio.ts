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

export function useSaleAudio(units: AudioUnit[], muted = false) {
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
      if (prev !== "verkocht" && unit.status === "verkocht") {
        playAudio(AUDIO_FILES.verkocht);
      } else if (prev !== "gereserveerd" && unit.status === "gereserveerd") {
        playAudio(AUDIO_FILES.gereserveerd);
      }
    });

    const map = new Map<string, UnitStatus>();
    units.forEach((u) => map.set(u.id, u.status));
    prevStatusRef.current = map;
  }, [units, muted]);
}
