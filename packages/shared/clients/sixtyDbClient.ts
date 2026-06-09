// 60db (60db.ai) API client.
// Docs: https://docs.60db.ai/api-reference
//
// Auth is a Bearer token passed in the Authorization header. Set SIXTYDB_API_KEY
// in your environment (same pattern as AZURE_SPEECH_KEY / OPEN_AI_API_KEY).

import { LANGUAGES } from "../languages";
import { type Voice } from "../voices";

const SIXTYDB_BASE_URL = "https://api.60db.ai";

function getApiKey(): string {
  const key = process.env.SIXTYDB_API_KEY;
  if (!key) {
    throw new Error("SIXTYDB_API_KEY is not set");
  }
  return key;
}

export type SixtyDbSynthesizeParams = {
  text: string;
  voice_id?: string;
  // 0.5 - 2.0, default 1
  speed?: number;
  // 0 - 100, default 50 (lower = more expressive)
  stability?: number;
  // 0 - 100, default 75 (voice match closeness)
  similarity?: number;
  enhance?: boolean;
  output_format?: "mp3" | "wav" | "ogg" | "flac";
};

type SixtyDbSynthesizeResponse = {
  success: boolean;
  message?: string;
  audio_base64: string;
  sample_rate?: number;
  duration_seconds?: number;
  encoding?: string;
  output_format?: string;
};

// POST /tts-synthesize — batch text-to-speech. Returns the audio as an ArrayBuffer
// (decoded from the base64 the API returns), matching the shape generateAudio expects.
export async function synthesizeSixtyDbAudio(
  params: SixtyDbSynthesizeParams,
): Promise<ArrayBuffer> {
  const response = await fetch(`${SIXTYDB_BASE_URL}/tts-synthesize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      output_format: "mp3",
      ...params,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`60db TTS failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as SixtyDbSynthesizeResponse;
  if (!data.success || !data.audio_base64) {
    throw new Error(`60db TTS returned no audio: ${data.message ?? "unknown error"}`);
  }

  // Decode base64 -> ArrayBuffer
  const buffer = Buffer.from(data.audio_base64, "base64");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export type SixtyDbVoice = {
  voice_id: string;
  name: string;
  category?: string;
  model?: string;
  labels?: {
    language?: string;
    language_name?: string;
    gender?: string;
    accent?: string;
  };
  description?: string | null;
  is_native?: boolean;
};

type SixtyDbVoicesResponse = {
  success: boolean;
  message?: string;
  data: SixtyDbVoice[];
};

// Map a 60db ISO language code (labels.language, e.g. "en", "es") to the app's
// AcceptedLanguage, using the ietf codes already declared in languages.ts.
function mapSixtyDbLanguage(isoCode: string | undefined): Voice["language"] {
  if (!isoCode) return "multilingual";
  const match = LANGUAGES.find((lang) => lang.ietf === isoCode.slice(0, 2));
  return match ? match.value : "multilingual";
}

// Convert a 60db voice (from /myvoices) into the app's Voice shape. The stable identifier
// is the UUID `voice_id`, which becomes `name` (what the rest of the app keys voices on);
// the human-readable `name` becomes `displayName` for the picker.
export function sixtyDbVoiceToVoice(v: SixtyDbVoice): Voice {
  return {
    provider: "60db",
    name: v.voice_id,
    displayName: v.name,
    exampleSoundUrl: null,
    language: mapSixtyDbLanguage(v.labels?.language),
    gender: v.labels?.gender === "female" ? "female" : "male",
  };
}

// GET /myvoices — list the voices available to the authenticated account.
export async function listSixtyDbVoices(): Promise<SixtyDbVoice[]> {
  const response = await fetch(`${SIXTYDB_BASE_URL}/myvoices`, {
    method: "GET",
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`60db /myvoices failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as SixtyDbVoicesResponse;
  return data.data ?? [];
}
