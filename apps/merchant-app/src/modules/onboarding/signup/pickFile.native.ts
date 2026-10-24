// Phone picker for the shop sign-up.
//
// Photos and documents on a phone need two Expo packages that the merchant app does not have yet.
// Adding them by hand to package.json would break `npm ci` for everyone (the lockfile would not match),
// so whoever owns the merchant app runs ONE command from apps/merchant-app, which updates both files:
//
//     npx expo install expo-image-picker expo-document-picker
//
// Then delete the stub below and uncomment the real version underneath it. Until then the
// phone sign-up skips the uploads (the admin sees "files to follow"), and file choosing works in the web build.
import type { PickKind, PickResult } from "./pickFile";

export type { PickKind, PickResult } from "./pickFile";

// Set to true together with the real picker below.
export const canPickFiles = false;

export async function pickFile(_kind: PickKind): Promise<PickResult> {
  return { unavailable: "Photo upload on phones is not switched on yet. You can finish sign-up now and add files later." };
}

/*
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export async function pickFile(kind: PickKind): Promise<PickResult> {
  if (kind === "image") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { unavailable: "Allow photo access in Settings to add pictures." };
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });
    if (r.canceled || !r.assets?.length) return { cancelled: true };
    const a = r.assets[0];
    return { file: { name: a.fileName ?? "photo.jpg", size: a.fileSize ?? 0, mimeType: a.mimeType ?? "image/jpeg", uri: a.uri } };
  }
  const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return { cancelled: true };
  const a = r.assets[0];
  return { file: { name: a.name, size: a.size ?? 0, mimeType: a.mimeType ?? "application/pdf", uri: a.uri } };
}
*/
