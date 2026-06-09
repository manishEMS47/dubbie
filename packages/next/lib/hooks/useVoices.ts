"use client";

import { useEffect, useState } from "react";
import { ALL_VOICES, type Voice } from "@dubbie/shared/voices";
import { getVoices } from "@/lib/actions/getVoices";

// Module-level cache so every picker shares a single /myvoices fetch for the session.
let cachedVoices: Voice[] | null = null;

// Returns the voice list for the pickers. Renders the static Azure/OpenAI voices immediately,
// then merges in the live 60db voices once getVoices() resolves. Falls back silently to the
// static list if the fetch fails (e.g. no SIXTYDB_API_KEY).
export function useVoices(): Voice[] {
  const [voices, setVoices] = useState<Voice[]>(cachedVoices ?? ALL_VOICES);

  useEffect(() => {
    if (cachedVoices) return;
    let active = true;
    getVoices()
      .then((all) => {
        cachedVoices = all;
        if (active) setVoices(all);
      })
      .catch((error) => {
        console.warn("useVoices: failed to load voices", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return voices;
}
