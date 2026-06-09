"use server";

import { listSixtyDbVoices, sixtyDbVoiceToVoice } from "@dubbie/shared/clients/sixtyDbClient";
import { ALL_VOICES, type Voice } from "@dubbie/shared/voices";

// Returns the full voice list shown in the picker: the static Azure/OpenAI voices plus the
// account's live 60db voices (GET /myvoices). If SIXTYDB_API_KEY is unset or the call fails,
// the 60db portion is empty and the picker behaves exactly as it did before 60db existed.

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let sixtyDbCache: { value: Voice[]; expiresAt: number } | null = null;

async function getSixtyDbVoices(): Promise<Voice[]> {
  if (sixtyDbCache && sixtyDbCache.expiresAt > Date.now()) {
    return sixtyDbCache.value;
  }
  try {
    const voices = (await listSixtyDbVoices()).map(sixtyDbVoiceToVoice);
    sixtyDbCache = { value: voices, expiresAt: Date.now() + CACHE_TTL_MS };
    return voices;
  } catch (error) {
    console.warn("Failed to fetch 60db voices:", error);
    // Serve stale cache if we have one, otherwise no 60db voices.
    return sixtyDbCache?.value ?? [];
  }
}

export async function getVoices(): Promise<Voice[]> {
  const sixtyDbVoices = await getSixtyDbVoices();
  return [...ALL_VOICES, ...sixtyDbVoices];
}
