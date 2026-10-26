import React, { useEffect, useState } from "react";
import { Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { api, errorText, serverTime } from "../../shared/api/client";
import { MODE_LABEL, Mode, Order, Reservation } from "../../shared/api/types";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { RESTAURANT_TABLES } from "../../shared/tables";
import { startAlert, stopAlert } from "../../shared/util/alertSound";
import { mmss, prettyDate, useCountdown } from "../../shared/util/format";
import { colors, fonts, radius, spacing, type } from "../../shared/theme/theme";
import ChatPanel from "../chat/ChatPanel";
import { useChat } from "../chat/ChatContext";
import { useCall } from "../calls/CallContext";
import { useLive } from "../orders/LiveDataContext";

// Full-screen pop-ups with an alert sound:
//   FR-5.5  new order request (not paid yet) -> items + fulfilment modes, Confirm / Reject, 10-minute countdown.
//           The customer pays only after the merchant confirms. Chat and in-app call with the customer are available here.
//   FR-5.8  new reservation -> booking + pre-order, Approve / Decline, 30-minute countdown
//   FR-5.9  reservation pop-up has chat and an in-app "Call customer" button
export default function PopupHost() {
  const { orders, reservations, refresh } = useLive();
  const [skipped, setSkipped] = useState<string[]>([]); // reservations the merchant chose to handle later
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pickTable, setPickTable] = useState(false);

  const now = serverTime();
  const order = orders.find((o) => o.status === "awaiting_merchant" && o.respondBy > now);
  const reservation = !order ? reservations.find((r) => r.status === "awaiting_restaurant" && r.respondBy > now && !skipped.includes(r.id)) : undefined;
  const active = !!order || !!reservation;

  useEffect(() => {
    if (active) startAlert();
    else stopAlert();
    return () => stopAlert();
  }, [active]);

  useEffect(() => {
    setError("");
    setPickTable(false);
  }, [order?.id, reservation?.id]);

  async function act(fn: () => Promise<unknown>) {
    // Close the keyboard first: closing the pop-up while a chat box still has focus can leave the screen stuck.
    Keyboard.dismiss();
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(errorText(e));
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={active} animationType="fade" transparent={false} onRequestClose={() => {}}>
      {order && <OrderPopup order={order} busy={busy} error={error} onAnswer={(accept) => act(() => api("POST", `/merchant/orders/${order.id}/respond`, { accept }))} />}
      {reservation && (
        <ReservationPopup
          r={reservation}
          all={reservations}
          busy={busy}
          error={error}
          pickTable={pickTable}
          setPickTable={setPickTable}
          onApprove={(table) => act(() => api("POST", `/merchant/reservations/${reservation.id}/respond`, { accept: true, table }))}
          onDecline={() => act(() => api("POST", `/merchant/reservations/${reservation.id}/respond`, { accept: false }))}
          onLater={() => setSkipped((p) => [...p, reservation.id])}
        />
      )}
    </Modal>
  );
}

function Countdown({ deadline, minutes }: { deadline: number; minutes: number }) {
  const s = useCountdown(deadline);
  const urgent = s < 60;
  return (
    <View style={[styles.timer, urgent && { backgroundColor: colors.chili }]}>
      <Text style={styles.timerNum} testID="popup-countdown">{mmss(s)}</Text>
      <Text style={styles.timerLabel}>left to answer ({minutes} min limit)</Text>
    </View>
  );
}

function ContactBar({ kind, id, name, chatOpen, onToggle }: { kind: "order" | "reservation"; id: string; name: string; chatOpen: boolean; onToggle: () => void }) {
  const { startCall, inCall } = useCall();
  const { unreadFor } = useChat();
  const n = unreadFor(kind, id);
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <PrimaryButton label={chatOpen ? "Hide chat" : `Chat with ${name}${n ? `  (${n})` : ""}`} variant="ghostLight" onPress={onToggle} style={{ flex: 1 }} testID="popup-chat-toggle" />
        <PrimaryButton label="Call" variant="ghostLight" onPress={() => startCall(kind, id)} disabled={inCall} style={{ flex: 1 }} testID="call-customer" />
      </View>
      {chatOpen && <ChatPanel kind={kind} id={id} height={320} />}
    </View>
  );
}

function OrderPopup({ order, busy, error, onAnswer }: { order: Order; busy: boolean; error: string; onAnswer: (accept: boolean) => void }) {
  const [chatOpen, setChatOpen] = useState(false);
  const modes = (["dine_in", "takeaway", "delivery"] as Mode[]).filter((m) => order.items.some((i) => i.mode === m));
  return (
    <View style={styles.screen} testID="order-popup">
      <ScrollView contentContainerStyle={styles.body} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <Text style={styles.kicker}>NEW ORDER REQUEST</Text>
        <Text style={styles.title}>#{order.id} · {order.customerName}</Text>
        <Countdown deadline={order.respondBy} minutes={10} />
        {modes.map((m) => (
          <View key={m} style={styles.group}>
            <Text style={styles.groupHead}>{MODE_LABEL[m]}</Text>
            {order.items.filter((i) => i.mode === m).map((i) => (
              <View key={i.id} style={styles.line}>
                <Text style={styles.lineText}>{i.qty}x {i.name}{i.options.length ? `  (${i.options.join(", ")})` : ""}</Text>
              </View>
            ))}
            {m === "delivery" && order.deliveryAddress && <Text style={type.small}>Deliver to: {order.deliveryAddress.line}</Text>}
          </View>
        ))}
        <Text style={styles.total}>Total: RM {order.total.toFixed(2)}</Text>
        <Text style={type.small}>Not paid yet. The customer pays after you confirm.</Text>
        <ContactBar kind="order" id={order.id} name={order.customerName} chatOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.actions}>
        <PrimaryButton label="Reject" variant="danger" onPress={() => onAnswer(false)} disabled={busy} style={{ flex: 1 }} testID="order-reject" />
        <PrimaryButton label="Confirm order" variant="success" onPress={() => onAnswer(true)} loading={busy} style={{ flex: 2 }} testID="order-accept" />
      </View>
    </View>
  );
}

function ReservationPopup(props: {
  r: Reservation; all: Reservation[]; busy: boolean; error: string; pickTable: boolean; setPickTable: (v: boolean) => void;
  onApprove: (table: string) => void; onDecline: () => void; onLater: () => void;
}) {
  const { r, all, busy, error, pickTable, setPickTable } = props;
  const [chatOpen, setChatOpen] = useState(false);
  const taken = new Set(all.filter((x) => x.id !== r.id && (x.status === "confirmed" || x.status === "awaiting_payment") && x.date === r.date && x.time === r.time && x.allocatedTable).map((x) => x.allocatedTable));
  return (
    <View style={styles.screen} testID="reservation-popup">
      <ScrollView contentContainerStyle={styles.body} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <Text style={styles.kicker}>NEW RESERVATION REQUEST</Text>
        <Text style={styles.title}>{r.customerName} · {r.partySize} guests</Text>
        <Text style={styles.sub}>{prettyDate(r.date)} at {r.time}</Text>
        <Countdown deadline={r.respondBy} minutes={30} />
        {r.specialRequest ? <Text style={[type.body, { fontStyle: "italic" }]}>"{r.specialRequest}"</Text> : null}
        <Text style={type.small}>{!r.payNow ? "Pay later" : r.paid ? `Paid RM ${r.paid.toFixed(2)}` : `Pay online: customer pays RM ${(r.amountDue ?? 0).toFixed(2)} after you confirm`}</Text>
        {r.preorder.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupHead}>Pre-order (approve each dish later in Table reservations)</Text>
            {r.preorder.map((p) => (
              <Text key={p.id} style={styles.lineText}>{p.qty}x {p.name}</Text>
            ))}
          </View>
        )}
        <ContactBar kind="reservation" id={r.id} name={r.customerName} chatOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />

        {pickTable && (
          <View style={styles.group}>
            <Text style={styles.groupHead}>Choose a table</Text>
            {RESTAURANT_TABLES.map((t) => {
              const unavailable = taken.has(t.id) || t.capacity < r.partySize;
              return (
                <Pressable key={t.id} disabled={unavailable || busy} onPress={() => props.onApprove(t.id)} style={[styles.tableRow, unavailable && { opacity: 0.4 }]} testID={`table-${t.id}`}>
                  <Text style={styles.lineText}>{t.name}</Text>
                  <Text style={type.small}>{taken.has(t.id) ? "Taken" : t.capacity < r.partySize ? "Too small" : "Select & confirm"}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.actions}>
        <PrimaryButton label="Decline" variant="danger" onPress={props.onDecline} disabled={busy} style={{ flex: 1 }} testID="res-decline" />
        <PrimaryButton label={pickTable ? "Back" : "Approve"} variant="success" onPress={() => setPickTable(!pickTable)} disabled={busy} style={{ flex: 1 }} testID="res-approve" />
        <PrimaryButton label="Later" variant="ghostLight" onPress={props.onLater} disabled={busy} style={{ flex: 1 }} testID="res-later" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, paddingTop: Platform.OS === "web" ? 24 : 48 },
  body: { padding: spacing.xl, gap: spacing.md, maxWidth: 560, width: "100%", alignSelf: "center" },
  kicker: { color: colors.turmeric, fontFamily: fonts.displayExtraBold, letterSpacing: 1.2, fontSize: 12 },
  title: { color: colors.white, fontFamily: fonts.displayExtraBold, fontSize: 26 },
  sub: { color: colors.stoneSoft, fontFamily: fonts.display, fontSize: 16 },
  timer: { backgroundColor: colors.herb, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center" },
  timerNum: { color: colors.white, fontFamily: fonts.displayExtraBold, fontSize: 44 },
  timerLabel: { color: colors.white, fontFamily: fonts.display, fontSize: 12 },
  group: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, gap: 6 },
  groupHead: { fontFamily: fonts.displayBold, fontSize: 12, color: colors.turmericDeep, textTransform: "uppercase", letterSpacing: 0.6 },
  line: { paddingVertical: 2 },
  lineText: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  total: { color: colors.white, fontFamily: fonts.displayBold, fontSize: 18 },
  tableRow: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.chiliSoft, fontFamily: fonts.display },
  actions: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.ink, maxWidth: 560, width: "100%", alignSelf: "center" },
});
