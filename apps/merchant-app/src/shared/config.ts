// App-wide settings. Override the backend address without editing code:
//   EXPO_PUBLIC_API_URL=http://192.168.1.23:3001 npx expo start
// "localhost" only works in a browser or emulator on the same PC; a real
// phone needs your PC's LAN IP address.
export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
