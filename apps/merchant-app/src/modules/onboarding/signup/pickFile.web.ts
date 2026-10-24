// Browser file chooser for the shop sign-up (Expo web build). No extra packages needed.
import type { PickKind, PickResult } from "./pickFile";

export type { PickKind, PickResult } from "./pickFile";

export const canPickFiles = true;

const ACCEPT: Record<PickKind, string> = {
  image: "image/jpeg,image/png",
  document: "application/pdf,image/jpeg,image/png",
};

export function pickFile(kind: PickKind): Promise<PickResult> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve({ unavailable: "Choosing files is not supported here." });
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPT[kind];
    input.style.display = "none";
    let settled = false;
    const finish = (r: PickResult) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(r);
    };
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return finish({ cancelled: true });
      finish({ file: { name: f.name, size: f.size, mimeType: f.type || guessType(f.name), uri: URL.createObjectURL(f), file: f } });
    };
    // Modern browsers fire "cancel" when the chooser is closed without a file.
    input.addEventListener("cancel", () => finish({ cancelled: true }));
    document.body.appendChild(input);
    input.click();
  });
}

function guessType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
}
