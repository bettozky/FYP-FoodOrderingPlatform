import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { DISH_PHOTO_FILES } from "../store/dishPhotos.js";

// Downloads the demo dish photos the first time the backend runs, then keeps them in backend/public/dishes/.
// Needs internet once. Without it the apps simply show a plain icon instead of the photo.
export const MEDIA_DIR = fileURLToPath(new URL("../../public", import.meta.url));

export async function fetchDishPhotos() {
  const dir = `${MEDIA_DIR}/dishes`;
  await mkdir(dir, { recursive: true });
  const missing = Object.entries(DISH_PHOTO_FILES).filter(([id]) => !existsSync(`${dir}/${id}.jpg`));
  if (!missing.length) return;
  console.log(`Downloading ${missing.length} dish photo(s) from Wikimedia Commons (first run only)...`);
  let ok = 0;
  for (const [id, file] of missing) {
    try {
      const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=720`;
      const res = await fetch(url, { headers: { "User-Agent": "ScootMealFYP/1.0 (Swinburne student project; demo dish photos)" }, signal: AbortSignal.timeout(20000) });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) throw new Error(`HTTP ${res.status} ${type}`);
      await writeFile(`${dir}/${id}.jpg`, Buffer.from(await res.arrayBuffer()));
      ok++;
    } catch (e) {
      console.warn(`  could not download ${id} (${file}): ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 400)); // be gentle with Wikimedia
  }
  console.log(`Dish photos ready: ${ok} downloaded, ${missing.length - ok} missing.`);
}
