// Speech-to-text for the assistant's microphone button.
//
// Tap the mic -> record with expo-audio (works in Expo Go, on phones and in the browser) -> tap stop ->
// the recording is uploaded to POST /api/ai/transcribe, where OpenAI turns it into text on the server
// (the API key never reaches the app) -> onText(text) is called.
//
// The customer may speak English, Malay, Mandarin or a mix; the server detects the language.
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from "expo-audio";

import { api, errorText } from "../../shared/api/client";
import { form } from "../../shared/util/files";

export type SpeechPhase = "idle" | "recording" | "transcribing";

/** Longest voice message. Recording stops by itself at this point and is transcribed. */
export const MAX_RECORDING_SECONDS = 60;
/** Taps shorter than this are treated as accidental and not sent. */
const MIN_RECORDING_MS = 600;

// Mono speech at 64 kbps: about 0.5 MB a minute, well under the server's 5 MB limit,
// and plenty for speech recognition.
const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
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

export function useSpeechToText(onText: (text: string) => void) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);

  const [phase, setPhase] = useState<SpeechPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  // Timed here rather than read from the recorder, whose status can still show the previous recording for a moment.
  const startedAt = useRef(0);

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
        throw new Error("Voice input needs the app to be opened over https or on localhost.");
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          Platform.OS === "web"
            ? "Microphone access was blocked. Allow the microphone in your browser to use voice input."
            : "Allow microphone access in your phone settings to use voice input."
        );
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setElapsedMs(0);
      setPhaseBoth("recording");
    } catch (e) {
      await releaseMicrophone();
      setPhaseBoth("idle");
      if (mounted.current) setError(e instanceof Error && e.message ? e.message : "Could not start the microphone.");
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

      if (!send) {
        setPhaseBoth("idle");
        busy.current = false;
        return;
      }

      if (!uri || durationMs < MIN_RECORDING_MS) {
        setPhaseBoth("idle");
        if (mounted.current) setError("That was too short. Tap the mic, speak, then tap stop.");
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

        if (!text) throw new Error("I couldn't hear anything. Please try again.");
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
    clearError: useCallback(() => setError(null), []),
    seconds: Math.min(MAX_RECORDING_SECONDS, Math.floor(elapsedMs / 1000)),
    start,
    stop,
    cancel,
  };
}