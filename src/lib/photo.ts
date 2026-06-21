import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import type { Dish, Food } from "@/types";

/**
 * Permanent on-device location for user photos. Lives under the app's document
 * directory (not the cache), so images survive restarts, OS cache eviction and
 * app updates. We only ever store these `file://` URIs in the database — never
 * base64 — which keeps the persisted blob tiny and avoids storage limits.
 */
const PHOTO_DIR = (FileSystem.documentDirectory ?? "") + "photos/";

let seq = 0;
function photoName(ext = "jpg") {
  return `p_${Date.now().toString(36)}_${(seq++).toString(36)}.${ext}`;
}

async function ensureDir() {
  if (!FileSystem.documentDirectory) return;
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

/**
 * Copy a transient image URI (image-picker cache file or a legacy `data:` blob)
 * into permanent app storage and return the stored `file://` URI. Best-effort:
 * if anything fails the original URI is returned unchanged.
 */
export async function persistPhotoUri(uri: string): Promise<string> {
  if (!uri) return uri;
  if (PHOTO_DIR && uri.startsWith(PHOTO_DIR)) return uri; // already persisted
  try {
    await ensureDir();
    const dest = PHOTO_DIR + photoName();
    if (uri.startsWith("data:")) {
      const base64 = uri.slice(uri.indexOf(",") + 1);
      await FileSystem.writeAsStringAsync(dest, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      await FileSystem.copyAsync({ from: uri, to: dest });
    }
    return dest;
  } catch {
    return uri;
  }
}

/** Open the photo library and return a permanent file URI, or null if cancelled. */
export async function pickPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    allowsEditing: true,
    aspect: [4, 3],
  });
  if (res.canceled || !res.assets?.length) return null;
  return persistPhotoUri(res.assets[0].uri);
}

/**
 * One-time migration: convert any inline `data:` base64 photos (from the legacy
 * AsyncStorage build) into files. Returns a new object; never mutates the input.
 */
export async function migrateShapePhotos<
  T extends { foods?: Food[]; dishes?: Dish[] },
>(shape: T): Promise<T> {
  const convert = async (photo?: string) =>
    photo && photo.startsWith("data:") ? await persistPhotoUri(photo) : photo;

  const foods = shape.foods
    ? await Promise.all(
        shape.foods.map(async (f) => ({ ...f, photo: await convert(f.photo) })),
      )
    : shape.foods;
  const dishes = shape.dishes
    ? await Promise.all(
        shape.dishes.map(async (d) => ({ ...d, photo: await convert(d.photo) })),
      )
    : shape.dishes;

  return { ...shape, foods, dishes };
}
