// Pure helpers for the pickup buzzer (no React, so the backend test runner can check them).

/** "Canteen A, Stall 3" -> { counter: "Stall 3", area: "Canteen A" }. Anything else is shown as it is. */
export function counterParts(stallNo?: string): { counter: string; area: string } {
  const m = /^\s*(.+?)\s*[,·-]\s*(Stall\s*\d{1,3})\s*$/i.exec(stallNo ?? "");
  if (m) return { counter: m[2].replace(/\s+/, " "), area: m[1] };
  return { counter: (stallNo ?? "").trim() || "the counter", area: "" };
}
