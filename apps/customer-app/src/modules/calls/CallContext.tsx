import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText, serverTime } from "../../shared/api/client";
import { colors, fonts, radius, spacing } from "../../shared/theme/theme";
import { startRing, stopRing } from "../../shared/util/ringtone";
import { createVoiceSession, SignalType, VoiceSession, voiceNote } from "../../shared/voice/voice";
import { useAuth } from "../auth/AuthContext";

// In-app voice calls. The backend relays the WebRTC handshake; polling every 1.5 s finds incoming calls
// (the same stand-in for push that the rest of the app uses). The audio itself goes device to device.
export type CallStatus = "ringing" | "active" | "ended" | "declined" | "missed";
type Signal = { seq: number; from: string; type: SignalType; data: any };
type CallView = {
  id: string; kind: "order" | "reservation"; threadId: string; status: CallStatus; direction: "incoming" | "outgoing";
  peerName: string; createdAt: number; answeredAt?: number; endedAt?: number; ringMs: number; signals: Signal[];
};

type CallValue = {
  /** Ring the other side of an order or reservation conversation. */
  startCall: (kind: "order" | "reservation", id: string) => Promise<void>;
  inCall: boolean;
};

const CallContext = createContext<CallValue | undefined>(undefined);
const POLL_MS = 1500;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [call, setCall] = useState<CallView | null>(null);
  const [muted, setMuted] = useState(false);
  const [note, setNote] = useState("");
  const [audioOn, setAudioOn] = useState(true);
  const [, tick] = useState(0);

  const callRef = useRef<CallView | null>(null);
  const session = useRef<VoiceSession | null>(null);
  const seen = useRef(new Set<number>());
  const buffered = useRef<Signal[]>([]);
  const lastSeq = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setBoth = (c: CallView | null) => { callRef.current = c; setCall(c); };

  const closeSession = useCallback(() => {
    session.current?.close();
    session.current = null;
    buffered.current = [];
    seen.current = new Set();
    lastSeq.current = 0;
    setMuted(false);
  }, []);

  const finish = useCallback((c: CallView, text: string) => {
    stopRing();
    closeSession();
    setBoth(c);
    setNote(text);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => { setBoth(null); setNote(""); }, 2200);
  }, [closeSession]);

  const makeSession = useCallback(async (callId: string, initiator: boolean) => {
    const s = await createVoiceSession({
      initiator,
      sendSignal: (type, data) => { api("POST", `/calls/${callId}/signal`, { type, data }).catch(() => {}); },
      onFailed: () => setNote("The connection dropped."),
    });
    session.current = s;
    setAudioOn(s.audio);
    return s;
  }, []);

  const applySignals = useCallback(async (signals: Signal[]) => {
    for (const sig of [...signals].sort((a, b) => a.seq - b.seq)) {
      if (seen.current.has(sig.seq)) continue;
      seen.current.add(sig.seq);
      lastSeq.current = Math.max(lastSeq.current, sig.seq);
      if (session.current) await session.current.handleSignal(sig.type, sig.data).catch(() => {});
      else buffered.current.push(sig); // incoming call not answered yet
    }
  }, []);

  // Poll for incoming calls and for the state of the current call.
  useEffect(() => {
    if (!isLoggedIn) { setBoth(null); closeSession(); stopRing(); return; }
    let stop = false;
    let busy = false;
    const run = async () => {
      if (busy || stop) return;
      busy = true;
      try {
        const r = await api<{ call: CallView | null }>("GET", `/calls/current?after=${lastSeq.current}`);
        const local = callRef.current;
        if (r.call) {
          if (!local || local.id !== r.call.id) {
            if (clearTimer.current) clearTimeout(clearTimer.current);
            seen.current = new Set(); lastSeq.current = 0; buffered.current = [];
            setNote("");
          }
          setBoth({ ...r.call, signals: [] });
          await applySignals(r.call.signals);
        } else if (local && (local.status === "ringing" || local.status === "active")) {
          // the server finished the call (the other side hung up, or it rang out)
          const f = await api<{ call: CallView }>("GET", `/calls/${local.id}`).catch(() => null);
          const status = f?.call.status ?? "ended";
          finish({ ...local, status }, status === "missed" ? (local.direction === "outgoing" ? "No answer" : "Missed call") : status === "declined" ? "Call declined" : "Call ended");
        }
      } catch { /* offline: next tick */ } finally { busy = false; }
    };
    run();
    const t = setInterval(run, POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, [isLoggedIn, applySignals, closeSession, finish]);

  // ring while an incoming call is waiting
  useEffect(() => {
    if (call?.direction === "incoming" && call.status === "ringing") startRing();
    else stopRing();
    return () => stopRing();
  }, [call?.id, call?.status, call?.direction]);

  // 1 s tick for the call timer
  useEffect(() => {
    if (call?.status !== "active") return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [call?.status]);

  const startCall = useCallback(async (kind: "order" | "reservation", id: string) => {
    if (callRef.current) return;
    try {
      const r = await api<{ call: CallView }>("POST", "/calls", { kind, id });
      if (clearTimer.current) clearTimeout(clearTimer.current);
      seen.current = new Set(); lastSeq.current = 0; buffered.current = [];
      setNote("");
      setBoth({ ...r.call, signals: [] });
      try {
        await makeSession(r.call.id, true);
      } catch (e) {
        await api("POST", `/calls/${r.call.id}/end`).catch(() => {});
        finish({ ...r.call, status: "ended" }, errorText(e));
      }
    } catch (e) {
      setNote(errorText(e));
      setBoth({ id: "err", kind, threadId: id, status: "ended", direction: "outgoing", peerName: "", createdAt: Date.now(), ringMs: 0, signals: [] });
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => { setBoth(null); setNote(""); }, 3000);
    }
  }, [makeSession, finish]);

  async function accept() {
    const c = callRef.current;
    if (!c) return;
    try {
      const r = await api<{ call: CallView }>("POST", `/calls/${c.id}/accept`);
      setBoth({ ...r.call, signals: [] });
      try {
        await makeSession(c.id, false);
        const queued = buffered.current; buffered.current = [];
        for (const s of queued) await session.current?.handleSignal(s.type, s.data).catch(() => {});
      } catch (e) {
        setNote(errorText(e)); // microphone problem: stay connected without audio
        setAudioOn(false);
      }
    } catch (e) {
      finish({ ...c, status: "ended" }, errorText(e));
    }
  }

  async function decline() {
    const c = callRef.current;
    if (!c) return;
    await api("POST", `/calls/${c.id}/decline`).catch(() => {});
    finish({ ...c, status: "declined" }, "Call declined");
  }

  async function hangUp() {
    const c = callRef.current;
    if (!c) return;
    await api("POST", `/calls/${c.id}/end`).catch(() => {});
    finish({ ...c, status: c.status === "ringing" ? "missed" : "ended" }, c.status === "ringing" ? "Call cancelled" : "Call ended");
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    session.current?.setMuted(next);
  }

  const incomingRinging = call?.direction === "incoming" && call.status === "ringing";
  const over = call && ["ended", "declined", "missed"].includes(call.status);
  const secs = call?.status === "active" && call.answeredAt ? Math.max(0, Math.floor((serverTime() - call.answeredAt) / 1000)) : 0;
  const timer = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const statusText = over ? note || "Call ended"
    : call?.status === "active" ? timer
    : incomingRinging ? "Incoming call"
    : "Calling...";

  return (
    <CallContext.Provider value={{ startCall, inCall: !!call }}>
      {children}
      <Modal visible={!!call} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.screen} testID="call-screen">
          <View style={styles.top}>
            <Text style={styles.kicker}>{call?.status === "active" ? "ScootMeal call" : incomingRinging ? "ScootMeal incoming call" : "ScootMeal call"}</Text>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(call?.peerName || "?").trim().charAt(0).toUpperCase()}</Text></View>
            <Text style={styles.name} testID="call-peer">{call?.peerName || ""}</Text>
            <Text style={styles.status} testID="call-status">{statusText}</Text>
            {call?.status === "active" && !over && note ? <Text style={styles.small}>{note}</Text> : null}
            {call?.status === "active" && !audioOn ? <Text style={styles.small}>{voiceNote || "No audio on this device."}</Text> : null}
          </View>
          {!over && (
            <View style={styles.actions}>
              {incomingRinging ? (
                <>
                  <RoundBtn icon="call" color={colors.chiliText} label="Decline" onPress={decline} testID="call-decline" rotate />
                  <RoundBtn icon="call" color={colors.herb} label="Accept" onPress={accept} testID="call-accept" />
                </>
              ) : (
                <>
                  {call?.status === "active" && <RoundBtn icon={muted ? "mic-off" : "mic"} color={muted ? colors.turmeric : colors.ink} label={muted ? "Unmute" : "Mute"} onPress={toggleMute} testID="call-mute" />}
                  <RoundBtn icon="call" color={colors.chiliText} label={call?.status === "ringing" ? "Cancel" : "End"} onPress={hangUp} testID="call-end" rotate />
                </>
              )}
            </View>
          )}
        </View>
      </Modal>
    </CallContext.Provider>
  );
}

function RoundBtn({ icon, color, label, onPress, testID, rotate }: { icon: any; color: string; label: string; onPress: () => void; testID: string; rotate?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Pressable onPress={onPress} style={[styles.round, { backgroundColor: color }]} testID={testID} accessibilityLabel={label}>
        <Ionicons name={icon} size={28} color={colors.white} style={rotate ? { transform: [{ rotate: "135deg" }] } : undefined} />
      </Pressable>
      <Text style={styles.roundLabel}>{label}</Text>
    </View>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, justifyContent: "space-between", paddingVertical: 72, paddingHorizontal: spacing.xl },
  top: { alignItems: "center", gap: spacing.md },
  kicker: { color: colors.turmeric, fontFamily: fonts.displayExtraBold, letterSpacing: 1.4, fontSize: 12 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center", marginTop: spacing.xl },
  avatarText: { fontSize: 52, fontFamily: fonts.displayExtraBold, color: colors.ink },
  name: { color: colors.white, fontSize: 26, fontFamily: fonts.displayExtraBold, textAlign: "center" },
  status: { color: colors.stoneSoft, fontSize: 18, fontFamily: fonts.display },
  small: { color: colors.stone, fontSize: 12.5, fontFamily: fonts.serif, textAlign: "center", maxWidth: 320 },
  actions: { flexDirection: "row", justifyContent: "center", gap: 56 },
  round: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  roundLabel: { color: colors.stoneSoft, fontSize: 12.5, fontFamily: fonts.display },
});
