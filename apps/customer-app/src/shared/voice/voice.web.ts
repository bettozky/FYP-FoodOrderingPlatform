// Browser WebRTC voice. Microphone access needs https or localhost.
import type { SignalType, VoiceOptions, VoiceSession } from "./voice";

export const voiceNote = "";
const ICE = [{ urls: "stun:stun.l.google.com:19302" }];

export async function createVoiceSession(opts: VoiceOptions): Promise<VoiceSession> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    throw new Error("This browser cannot use the microphone here. Open the app over https or on localhost.");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new Error("Microphone access was blocked. Allow the microphone to make calls.");
  }
  const pc = new RTCPeerConnection({ iceServers: ICE });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));

  const audioEl = document.createElement("audio");
  audioEl.autoplay = true;
  (audioEl as any).playsInline = true;
  audioEl.style.display = "none";
  document.body.appendChild(audioEl);
  pc.ontrack = (e) => {
    audioEl.srcObject = e.streams[0] ?? new MediaStream([e.track]);
    audioEl.play().catch(() => {});
  };
  pc.onicecandidate = (e) => {
    if (e.candidate) opts.sendSignal("candidate", e.candidate.toJSON());
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") opts.onConnected?.();
    if (pc.connectionState === "failed") opts.onFailed?.();
  };

  const pending: any[] = [];
  let remoteSet = false;
  const flush = async () => {
    while (pending.length) await pc.addIceCandidate(pending.shift()).catch(() => {});
  };

  if (opts.initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    opts.sendSignal("offer", { type: offer.type, sdp: offer.sdp });
  }

  return {
    audio: true,
    async handleSignal(type: SignalType, data: any) {
      if (type === "offer" && !opts.initiator) {
        await pc.setRemoteDescription(data);
        remoteSet = true;
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        opts.sendSignal("answer", { type: answer.type, sdp: answer.sdp });
        await flush();
      } else if (type === "answer" && opts.initiator) {
        await pc.setRemoteDescription(data);
        remoteSet = true;
        await flush();
      } else if (type === "candidate") {
        if (remoteSet) await pc.addIceCandidate(data).catch(() => {});
        else pending.push(data);
      }
    },
    setMuted(muted: boolean) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
    },
    close() {
      try { stream.getTracks().forEach((t) => t.stop()); } catch {}
      try { pc.close(); } catch {}
      audioEl.srcObject = null;
      audioEl.remove();
    },
  };
}
