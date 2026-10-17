// Ringing for incoming calls. Native: vibration pattern. Web: see ringtone.web.ts.
import { Vibration } from "react-native";

export function startRing() {
  Vibration.vibrate([0, 700, 500], true);
}
export function stopRing() {
  Vibration.cancel();
}
