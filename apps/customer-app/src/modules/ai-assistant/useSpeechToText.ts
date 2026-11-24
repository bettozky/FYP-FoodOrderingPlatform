// Speech-to-text for the customer assistant (chat mode's mic button and voice mode).
//
// Start -> record with expo-audio (works in Expo Go, on phones and in the browser) -> stop ->
// the recording is uploaded to POST /api/ai/transcribe, where OpenAI turns it into text on the server
// (the API key never reaches the app) -> onText(text) is called.
//
// With { autoStop: true } (voice mode) it also watches the microphone volume: it stops by itself when the
// customer goes quiet after speaking, and gives up if nobody speaks at all.
//
// The customer may speak English, Malay, Mandarin or a mix; the server detects the language.
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";

import { api, errorText } from "../../shared/api/client";
import { form } from "../../shared/util/files";
import i18n from "i18next";

export type SpeechPhase = "idle" | "recording" | "transcribing";

/** Longest voice message. Recording stops by itself at this point and is transcribed. */
export const MAX_RECORDING_SECONDS = 60;
/** Taps shorter than this are treated as accidental and not sent. */
const MIN_RECORDING_MS = 600;

// Silence detection (voice mode only).
const METER_EVERY_MS = 100; // how often the volume is read
const CALIBRATE_MS = 400; // the first moments measure the background noise of the stall
const ABOVE_NOISE_DB = 10; // speech must be this much louder than the background noise
const MIN_THRESHOLD_DB = -50; // ...and never quieter than this
const SILENCE_MS = 1200; // quiet for this long after speaking = finished
const NO_SPEECH_MS = 7000; // nobody spoke at all: give up


// Mono speech at 64 kbps: about 0.5 MB a minute, well under the server's 5 MB limit,
// and plenty for speech recognition. Metering gives the volume for silence detection and the orb.
const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
};

/** Lets the phone play sounds through the speaker again after recording (iOS routes audio to the earpiece while recording). */
async function releaseMicrophone() {
  try {
    await setAudioModeAsync({ allowsRecording: false });
  } catch {
    /* ignore */
  }
}

export function useSpeechToText(onText: (text: string) => void, options: { autoStop?: boolean } = {}) {
  const autoStop = options.autoStop ?? false;
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, METER_EVERY_MS);

  const [phase, setPhase] = useState<SpeechPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0); // 0 = quiet, 1 = loud (for the orb)
  // Timed here rather than read from the recorder, whose status can still show the previous recording for a moment.
  const startedAt = useRef(0);

  // Silence detection state for the current recording.
  const noiseSamples = useRef<number[]>([]);
  const heardSpeech = useRef(false);
  const quietSince = useRef<number | null>(null);

  // Refs so async steps always see the latest values (and a double tap can't start two recordings).
  const phaseRef = useRef<SpeechPhase>("idle");
  const busy = useRef(false);
  const mounted = useRef(true);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const setPhaseBoth = (next: SpeechPhase) => {
    phaseRef.current = next;
    if (mounted.current) setPhase(next);
  };

  const start = useCallback(async () => {
    if (busy.current || phaseRef.current !== "idle") return;
    busy.current = true;
    setError(null);

    try {
      // Browsers only allow the microphone on https or localhost (same rule as the voice calls).
      if (Platform.OS === "web" && !(globalThis as any).navigator?.mediaDevices?.getUserMedia) {
        throw new Error(i18n.t("ai.needHttps"));
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          Platform.OS === "web"
            ? i18n.t("ai.micBlockedWeb")
            : i18n.t("ai.micBlockedPhone")
        );
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      noiseSamples.current = [];
      heardSpeech.current = false;
      quietSince.current = null;
      setElapsedMs(0);
      setPhaseBoth("recording");
    } catch (e) {
      await releaseMicrophone();
      setPhaseBoth("idle");
      if (mounted.current) setError(e instanceof Error && e.message ? e.message : i18n.t("ai.micFailed"));
    } finally {
      busy.current = false;
    }
  }, [recorder]);

  /** Stops recording. With send = true the recording is transcribed and onText is called; otherwise it is thrown away. */
  const finish = useCallback(
    async (send: boolean) => {
      if (busy.current || phaseRef.current !== "recording") return;
      busy.current = true;

      const durationMs = Date.now() - startedAt.current;
      let uri: string | null = null;

      try {
        await recorder.stop();
        uri = recorder.uri;
      } catch {
        uri = null;
      }
      await releaseMicrophone();
      if (mounted.current) setLevel(0);

      if (!send) {
        setPhaseBoth("idle");
        busy.current = false;
        return;
      }

      if (!uri || durationMs < MIN_RECORDING_MS) {
        setPhaseBoth("idle");
        if (mounted.current) setError(i18n.t("ai.tooShort"));
        busy.current = false;
        return;
      }

      setPhaseBoth("transcribing");

      try {
        const isWeb = Platform.OS === "web";
        const body = await form(
          {},
          {
            audio: {
              uri,
              name: isWeb ? "voice.webm" : "voice.m4a",
              type: isWeb ? "audio/webm" : "audio/m4a",
            },
          }
        );

        const data = await api<{ text: string }>("POST", "/ai/transcribe", body);
        const text = typeof data.text === "string" ? data.text.trim() : "";

        if (!text) throw new Error(i18n.t("ai.heardNothing"));
        if (mounted.current) onTextRef.current(text);
      } catch (e) {
        if (mounted.current) setError(errorText(e));
      } finally {
        setPhaseBoth("idle");
        busy.current = false;
      }
    },
    [recorder]
  );

  const stop = useCallback(() => finish(true), [finish]);
  const cancel = useCallback(() => finish(false), [finish]);

  // Recording timer for the "Listening… 0:07" label. Stops by itself at the time limit and uses what was said so far.
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsedMs(ms);
      if (ms >= MAX_RECORDING_SECONDS * 1000) void finish(true);
    }, 250);
    return () => clearInterval(timer);
  }, [phase, finish]);

  // Volume (every 100 ms while recording): drives the orb, and in voice mode decides when the customer has finished.
  // If the device gives no volume reading, nothing stops by itself: the customer taps the orb instead.
  useEffect(() => {
    if (phaseRef.current !== "recording") return;
    const db = recorderState.metering;
    if (typeof db !== "number" || !Number.isFinite(db)) return;

    const now = Date.now();
    const elapsed = now - startedAt.current;

    // 1. Measure the background noise first (a food court is never silent).
    if (elapsed < CALIBRATE_MS) {
      noiseSamples.current.push(db);
      return;
    }
    const samples = noiseSamples.current;
    const noise = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : -60;
    const threshold = Math.max(noise + ABOVE_NOISE_DB, MIN_THRESHOLD_DB);

    // 2. Orb level: 0 at the background noise, 1 when clearly speaking.
    if (mounted.current) setLevel(Math.min(1, Math.max(0, (db - noise) / 30)));

    if (!autoStop) return;

    // 3. Speaking? Then wait for a pause. Never spoke? Give up after a while.
    if (db > threshold) {
      heardSpeech.current = true;
      quietSince.current = null;
    } else if (heardSpeech.current) {
      quietSince.current ??= now;
      if (now - quietSince.current >= SILENCE_MS) void finish(true);
    } else if (elapsed >= NO_SPEECH_MS) {
      void finish(false).then(() => {
        if (mounted.current) setError(i18n.t("ai.voiceNoSpeech"));
      });
    }
  }, [recorderState.metering, recorderState.durationMillis, autoStop, finish]);

  // Leaving the screen while recording: stop and free the microphone.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (phaseRef.current === "recording") {
        try {
          void recorder.stop().catch(() => undefined);
        } catch {
          /* already released */
        }
        void releaseMicrophone();
      }
    };
  }, [recorder]);

  return {
    phase,
    error,
    level,
    clearError: useCallback(() => setError(null), []),
    seconds: Math.min(MAX_RECORDING_SECONDS, Math.floor(elapsedMs / 1000)),
    start,
    stop,
    cancel,
  };
}