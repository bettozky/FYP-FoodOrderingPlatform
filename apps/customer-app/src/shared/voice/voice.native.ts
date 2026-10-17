// Phone WebRTC voice through react-native-webrtc. That library contains native code, so it only works in a
// development build (npx expo run:android / run:ios or EAS Build). In Expo Go the import fails; the call
// screen then still works (ring, answer, timer, hang up) but there is no audio.
import { PermissionsAndroid, Platform } from "react-native";
import type { SignalType, VoiceOptions, VoiceSession } from "./voice";

export const voiceNote = "Audio needs a development build of the app (Expo Go cannot carry voice). The call screen still works.";
const ICE = [{ urls: "stun:stun.l.google.com:19302" }];

let rtc: any = null;
try {
  rtc = require("react-native-webrtc");
} catch {
  rtc = null;
}

export async function createVoiceSession(opts: VoiceOptions): Promise<VoiceSession> {
  if (!rtc || !rtc.mediaDevices) return { audio: false, async handleSignal() {}, setMuted() {}, close() {} };
  if (Platform.OS === "android") {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (r !== PermissionsAndroid.RESULTS.GRANTED) throw new Error("Microphone permission was denied.");
  }
  let stream: any;
  try {
    stream = await rtc.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch {
    throw new Error("Could not open the microphone.");
  }
  const pc = new rtc.RTCPeerConnection({ iceServers: ICE });
  stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));
  pc.addEventListener("icecandidate", (e: any) => {
    if (e.candidate) opts.sendSignal("candidate", e.candidate.toJSON ? e.candidate.toJSON() : e.candidate);
  });
  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "connected") opts.onConnected?.();
    if (pc.connectionState === "failed") opts.onFailed?.();
  });

  const pending: any[] = [];
  let remoteSet = false;
  const flush = async () => {
    while (pending.length) await pc.addIceCandidate(new rtc.RTCIceCandidate(pending.shift())).catch(() => {});
  };

  if (opts.initiator) {
    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    opts.sendSignal("offer", { type: offer.type, sdp: offer.sdp });
  }

  return {
    audio: true,
    async handleSignal(type: SignalType, data: any) {
      if (type === "offer" && !opts.initiator) {
        await pc.setRemoteDescription(new rtc.RTCSessionDescription(data));
        remoteSet = true;
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        opts.sendSignal("answer", { type: answer.type, sdp: answer.sdp });
        await flush();
      } else if (type === "answer" && opts.initiator) {
        await pc.setRemoteDescription(new rtc.RTCSessionDescription(data));
        remoteSet = true;
        await flush();
      } else if (type === "candidate") {
        if (remoteSet) await pc.addIceCandidate(new rtc.RTCIceCandidate(data)).catch(() => {});
        else pending.push(data);
      }
    },
    setMuted(muted: boolean) {
      stream.getAudioTracks().forEach((t: any) => (t.enabled = !muted));
    },
    close() {
      try { stream.getTracks().forEach((t: any) => t.stop()); } catch {}
      try { pc.close(); } catch {}
    },
  };
}
