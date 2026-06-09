import { AcceptedLanguage } from "@dubbie/db";
import voicesData from "./voicesData.json";

export type Voice = {
  provider: "azure" | "openai" | "60db";
  // For azure/openai this is the model voice name; for 60db it is the voice_id (UUID).
  name: string;
  // Human-friendly label shown in the picker. Used by 60db (whose `name` is a UUID);
  // azure/openai leave it unset and fall back to `name`.
  displayName?: string;
  exampleSoundUrl: string | null;
  language: AcceptedLanguage | "multilingual";
  gender: "male" | "female";
};

const AZURE_VOICES = voicesData.azure as Voice[];

const OPENAI_VOICES = voicesData.openai as Voice[];

// Static, synchronous list. 60db voices are NOT here — they are fetched at runtime from
// GET /myvoices (see getVoices server action), so this stays sync for languages.ts.
export const ALL_VOICES: Voice[] = [...AZURE_VOICES, ...OPENAI_VOICES];

export const DEFAULT_VOICE = ALL_VOICES[1];

// Reconstruct a Voice from the (name, provider) stored on a Segment. generateAudio only
// reads `provider` + `name`, so for a 60db voice we can build it from the stored voice_id
// without hitting /myvoices. Falls back to DEFAULT_VOICE for an unknown non-60db voice.
export function resolveVoice(name: string, provider: string): Voice {
  const found = ALL_VOICES.find((v) => v.name === name && v.provider === provider);
  if (found) return found;
  if (provider === "60db") {
    return {
      provider: "60db",
      name,
      displayName: name,
      exampleSoundUrl: null,
      language: "multilingual",
      gender: "male",
    };
  }
  return DEFAULT_VOICE;
}
