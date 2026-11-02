import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

/** A picked file, ready to send (see form()). */
export type LocalFile = { uri: string; name: string; type: string; size?: number };

/**
 * Builds the multipart body for api("POST", path, form(...)).
 * On a phone a file is appended as { uri, name, type }; in the browser it has to be a real Blob.
 */
export async function form(fields: Record<string, string | number | boolean | string[] | undefined>, files: Record<string, LocalFile | null | undefined> = {}): Promise<FormData> {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) f.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
  for (const [k, file] of Object.entries(files)) {
    if (!file) continue;
    if (Platform.OS === "web") f.append(k, await (await fetch(file.uri)).blob(), file.name);
    else f.append(k, { uri: file.uri, name: file.name, type: file.type } as any);
  }
  return f;
}

/**
 * Lets the person choose a photo from the gallery or take one with the camera, crops it to `aspect`, and shrinks it
 * (long side 1280 px, JPEG) so it uploads quickly and stays far below the server's size limit.
 * Returns null if they cancel. Throws an Error with a plain message if the permission was refused.
 */
export async function pickImage(source: "library" | "camera", aspect: [number, number] = [1, 1]): Promise<LocalFile | null> {
  if (Platform.OS !== "web") {
    const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error(source === "camera" ? "Allow camera access in your phone settings to take a photo." : "Allow photo access in your phone settings to choose a picture.");
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect, quality: 0.85 };
  const r = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  const resize = a.width >= a.height ? { width: Math.min(a.width, 1280) } : { height: Math.min(a.height, 1280) };
  const out = await ImageManipulator.manipulateAsync(a.uri, [{ resize }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
  return { uri: out.uri, name: `photo-${Date.now()}.jpg`, type: "image/jpeg" };
}

/** Lets the person choose a CV / document (PDF, Word, JPG or PNG). Returns null if they cancel. */
export async function pickDocument(): Promise<LocalFile | null> {
  const r = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"],
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.name, type: a.mimeType ?? "application/octet-stream", size: a.size };
}
