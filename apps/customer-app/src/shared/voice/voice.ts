// Voice engine for in-app calls (WebRTC). The platform files do the real work:
//   voice.web.ts     -> browser WebRTC (works in any modern browser)
//   voice.native.ts  -> react-native-webrtc (needs a development build; not available in Expo Go)
// This file holds the shared types and is the fallback for any other platform.
export type SignalType = "offer" | "answer" | "candidate";

export interface VoiceSession {
  /** True when real audio is flowing through this session. False means call screen only. */
  audio: boolean;
  /** Feed a handshake message received from the other person. */
  handleSignal(type: SignalType, data: any): Promise<void>;
  setMuted(muted: boolean): void;
  close(): void;
}

export interface VoiceOptions {
  /** The caller creates the offer. The callee waits for it. */
  initiator: boolean;
  /** Send a handshake message to the other person (through the backend). */
  sendSignal: (type: SignalType, data: any) => void;
  onConnected?: () => void;
  onFailed?: () => void;
}

/** Why audio is unavailable, shown on the call screen. */
export let voiceNote = "Audio calls are not supported on this device.";

export async function createVoiceSession(_opts: VoiceOptions): Promise<VoiceSession> {
  return { audio: false, async handleSignal() {}, setMuted() {}, close() {} };
}
