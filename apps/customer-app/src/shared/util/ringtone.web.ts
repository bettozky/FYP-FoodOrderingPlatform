// Browser ringtone made with the Web Audio API (no audio file needed). Browsers may block sound until the
// person has tapped the page once; the incoming-call screen is shown either way.
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function beep() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    ctx = ctx ?? new AC();
    const c = ctx!;
    if (c.state === "suspended") c.resume().catch(() => {});
    for (const [offset, freq] of [[0, 880], [0.25, 660]] as const) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, c.currentTime + offset);
      g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + offset + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + offset + 0.22);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime + offset);
      o.stop(c.currentTime + offset + 0.25);
    }
  } catch {
    /* sound unavailable */
  }
}

export function startRing() {
  if (timer) return;
  beep();
  timer = setInterval(beep, 1600);
}
export function stopRing() {
  if (timer) clearInterval(timer);
  timer = null;
}
