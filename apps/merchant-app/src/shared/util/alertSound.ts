// Alert sound + vibration for new-order / new-reservation pop-ups (FR-5.5).
// Uses expo-audio with assets/alert.wav; any failure (e.g. a browser blocking autoplay) is ignored,
// because the pop-up itself and the vibration still get the merchant's attention.
import { Platform, Vibration } from "react-native";
import { createAudioPlayer } from "expo-audio";

type Player = ReturnType<typeof createAudioPlayer>;
let player: Player | null = null;
let playing = false;

export function startAlert() {
  if (playing) return;
  playing = true;
  try {
    if (!player) {
      player = createAudioPlayer(require("../../../assets/alert.wav"));
      player.loop = true;
    }
    player.seekTo(0);
    player.play();
  } catch {
    /* sound unavailable */
  }
  if (Platform.OS !== "web") Vibration.vibrate([0, 600, 400], true);
}

export function stopAlert() {
  if (!playing) return;
  playing = false;
  try {
    player?.pause();
  } catch {
    /* ignore */
  }
  if (Platform.OS !== "web") Vibration.cancel();
}
