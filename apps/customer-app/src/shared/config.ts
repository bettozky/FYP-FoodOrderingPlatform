// App-wide settings.
//
// Where is the backend? In order:
//   1. EXPO_PUBLIC_API_URL, if set:  EXPO_PUBLIC_API_URL=http://192.168.1.23:3001 npx expo start
//   2. The PC that is running `expo start`. Expo Go already knows that PC's
//      address (it downloaded the app from it), so we reuse it and assume the
//      backend runs on the same PC at port 3001. No setup needed.
//   3. http://localhost:3001 (browser / emulator on the same PC).
import { NativeModules, Platform } from "react-native";

const BACKEND_PORT = 3001;

// Only an IP address or localhost can be the backend. Expo "tunnel" mode gives
// a *.exp.direct name instead, which does not forward port 3001.
const isUsableHost = (h: string) => h === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(h);

function devServerHost(): string | null {
  try {
    if (Platform.OS === "web") {
      const h: string | undefined = (globalThis as any).location?.hostname;
      return h && isUsableHost(h) ? h : null;
    }
    const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
    const m = scriptURL?.match(/^https?:\/\/([^:/]+)/);
    return m && isUsableHost(m[1]) ? m[1] : null;
  } catch {
    return null;
  }
}

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${devServerHost() ?? "localhost"}:${BACKEND_PORT}`;
