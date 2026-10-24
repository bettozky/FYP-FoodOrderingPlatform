// Choosing a photo or document for the shop sign-up. The platform files do the real work:
//   pickFile.web.ts     -> browser file chooser (works now, no extra packages)
//   pickFile.native.ts  -> phone picker (needs expo-image-picker + expo-document-picker, see that file)
// This file holds the shared types and is the fallback for any other platform.
import type { PickedFile } from "./types";

export type PickKind = "image" | "document";

export type PickResult = { file: PickedFile } | { cancelled: true } | { unavailable: string };

/** False where choosing files is not switched on yet. The wizard then lets merchants add files after approval. */
export const canPickFiles = false;

export async function pickFile(_kind: PickKind): Promise<PickResult> {
  return { unavailable: "Choosing files is not supported on this device yet." };
}
