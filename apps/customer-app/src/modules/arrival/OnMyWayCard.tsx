import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorText } from "../../shared/api/client";
import type { Order } from "../../shared/api/types";
import { colors, fonts, radius, spacing, type, ui } from "../../shared/theme/theme";

// Feature 2 "Ready when you arrive" (Nov 2026), shown on Order tracking for dine-in / takeaway food.
// The customer taps "I'm 5 min away" (or 10 / 15); the stall gets a "Customer on the way" alert and sees
// the arrival time on the order, so it can time the food. The card compares the arrival time with the
// order's live "ready in" estimate from the server.
const CHOICES = [5, 10, 15];

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function OnMyWayCard({ order, onChange }: { order: Order; onChange?: () => void }) {
  const [minutes, setMinutes] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Keep "in 4 min" counting down.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  if (!order.canSayArriving) return null;

  const readyIn = order.readyInMinutes ?? null;
  const arriveIn = order.arrivingAt ? Math.ceil((order.arrivingAt - now) / 60000) : null;
  const told = arriveIn !== null && arriveIn > 0 && !editing;

  async function send() {
    setBusy(true);
    setError("");
    try {
      await api("POST", `/orders/${order.id}/arriving`, { minutes });
      setEditing(false);
      setNow(Date.now());
      onChange?.();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card} testID="on-my-way">
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="walk" size={18} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>Ready when you arrive</Text>
          {readyIn !== null ? (
            <Text style={type.small}>Your food: ready in about {readyIn} min</Text>
          ) : (
            <Text style={type.small}>Your food is ready at the counter</Text>
          )}
        </View>
      </View>

      {told ? (
        <>
          <Text style={type.body}>
            The stall knows you'll arrive at <Text style={styles.bold}>{clock(order.arrivingAt!)}</Text> (in {arriveIn} min).
          </Text>
          {readyIn !== null ? (
            readyIn <= arriveIn! ? (
              <View style={[styles.fit, { backgroundColor: colors.herbLight }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.herb} />
                <Text style={[styles.fitText, { color: colors.herb }]}>Your food should be ready when you get there.</Text>
              </View>
            ) : (
              <View style={[styles.fit, { backgroundColor: colors.amberTint }]}>
                <Ionicons name="time" size={16} color={colors.amberText} />
                <Text style={[styles.fitText, { color: colors.amberText }]}>You may wait about {readyIn - arriveIn!} min at the stall.</Text>
              </View>
            )
          ) : null}
          <Pressable onPress={() => setEditing(true)} hitSlop={8} accessibilityRole="button">
            <Text style={ui.link}>Change my time</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={type.bodyMuted}>
            {arriveIn !== null && arriveIn <= 0 && !editing ? "You should be at the stall now. Running late? Send a new time." : "Tell the stall when you're on your way so your food is fresh when you get there."}
          </Text>
          <View style={styles.choices}>
            {CHOICES.map((c) => {
              const on = minutes === c;
              return (
                <Pressable key={c} onPress={() => setMinutes(c)} style={[ui.chip, styles.choice, on && ui.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} testID={`arrive-${c}`}>
                  <Text style={[ui.chipText, on && ui.chipTextOn]}>{c} min</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={[ui.buttonAccent, busy && { opacity: 0.6 }]} onPress={send} disabled={busy} accessibilityRole="button" testID="im-on-my-way">
            <Text style={ui.buttonAccentText}>{busy ? "Telling the stall…" : `I'm ${minutes} min away`}</Text>
          </Pressable>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...ui.card, padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.turmeric, alignItems: "center", justifyContent: "center" },
  bold: { fontFamily: fonts.displayBold },
  fit: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  fitText: { flex: 1, fontFamily: fonts.displayBold, fontSize: 13 },
  choices: { flexDirection: "row", gap: spacing.sm },
  choice: { flex: 1, justifyContent: "center" },
  error: { fontFamily: fonts.display, fontSize: 12.5, color: colors.chiliText },
});
