// Reads the assistant's answers out loud with the phone's own voice (expo-speech): free, works offline,
// in Expo Go and in browsers. How good Malay and Chinese sound depends on the voices installed on the phone.
// (ElevenLabs can replace this later for a more natural voice.)
import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";

export type SpeakLanguage = "en" | "ms" | "zh";

// Which phone voice to use for each language the backend reports.
const VOICE_LANGUAGE: Record<SpeakLanguage, string> = { en: "en-US", ms: "ms-MY", zh: "zh-CN" };

/** Removes things a voice reads badly: emoji, Markdown symbols and extra spaces. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[*_#`~>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  const mounted = useRef(true);
  // Finishes the sentence that is being spoken right now (so stop() can end it early).
  const current = useRef<((finished: boolean) => void) | null>(null);

  /** Stops speaking straight away. */
  const stop = useCallback(() => {
    const end = current.current;
    current.current = null;
    void Speech.stop();
    end?.(false);
  }, []);

  /** Speaks the text. Resolves true when it finished, false when it was stopped or failed. */
  const speak = useCallback(
    (text: string, language: SpeakLanguage = "en") => {
      stop(); // never talk over ourselves
      const words = cleanForSpeech(text);
      if (!words) return Promise.resolve(false);

      return new Promise<boolean>((resolve) => {
        let done = false;
        const end = (finished: boolean) => {
          if (done) return;
          done = true;
          clearTimeout(safety);
          if (current.current === end) current.current = null;
          if (mounted.current) setSpeaking(false);
          resolve(finished);
        };
        // Some browsers never report the end of speech: stop waiting after about as long as it should take.
        const safety = setTimeout(() => end(true), 4000 + words.length * 90);

        current.current = end;
        setSpeaking(true);
        Speech.speak(words, {
          language: VOICE_LANGUAGE[language],
          onDone: () => end(true),
          onStopped: () => end(false),
          onError: () => end(false),
        });
      });
    },
    [stop]
  );

  // Leaving the screen: stop talking.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, [stop]);

  return { speaking, speak, stop };
}