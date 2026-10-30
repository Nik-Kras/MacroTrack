import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { migrateShapePhotos } from "@/lib/photo";
import { SCHEMA_VERSION, type PersistShape } from "@/store/persistence";
import type { Dish, Food } from "@/types";

/**
 * A backup is a single self-contained JSON file: the full persistable state with
 * every photo embedded inline as a base64 `data:` URI. That makes it portable —
 * it survives uninstalling the app, moving to a new phone, or sharing with a
 * friend — because nothing points back into the (now-deleted) app sandbox.
 */
const MAGIC = "macrotrack-backup";

interface BackupEnvelope {
  magic: string;
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  data: PersistShape;
}

const APP_VERSION = "1.0.0";

function timestamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Read a stored photo file back into an inline data: URI for the portable backup. */
async function inlinePhoto(photo?: string): Promise<string | undefined> {
  if (!photo) return undefined;
  if (photo.startsWith("data:")) return photo; // already inline
  try {
    const b64 = await FileSystem.readAsStringAsync(photo, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return undefined; // file missing — drop the photo rather than fail the backup
  }
}

async function inlineAllPhotos(data: PersistShape): Promise<PersistShape> {
  const foods: Food[] = await Promise.all(
    data.foods.map(async (f) => ({ ...f, photo: await inlinePhoto(f.photo) })),
  );
  const dishes: Dish[] = await Promise.all(
    data.dishes.map(async (d) => ({ ...d, photo: await inlinePhoto(d.photo) })),
  );
  const profile = { ...data.profile, photo: await inlinePhoto(data.profile.photo) };
  return { ...data, profile, foods, dishes };
}

/**
 * Build a backup file from the given state and open the OS share sheet so the
 * user can save it to Files / iCloud Drive / Google Drive / email / etc.
 * Returns the file name on success. Throws on failure.
 */
export async function exportBackup(data: PersistShape): Promise<string> {
  const inlined = await inlineAllPhotos(data);
  const envelope: BackupEnvelope = {
    magic: MAGIC,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: inlined,
  };

  const fileName = `MacroTrack-backup-${timestamp(new Date())}.json`;
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error("No writable storage available");
  const path = dir + fileName;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(envelope));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(path, {
    mimeType: "application/json",
    dialogTitle: "Save MacroTrack backup",
    UTI: "public.json",
  });
  return fileName;
}

function normalize(data: Partial<PersistShape>): PersistShape | null {
  if (!data || typeof data !== "object" || !data.profile) return null;
  return {
    profile: data.profile,
    logs: data.logs ?? {},
    foods: data.foods ?? [],
    dishes: data.dishes ?? [],
    measurements: data.measurements ?? [],
    learned: data.learned && typeof data.learned === "object" ? data.learned : {},
  };
}

/**
 * Let the user pick a backup file, validate it, write its embedded photos back
 * out as files, and return the restored state (with `file://` photo URIs).
 * Returns null if the user cancels. Throws with a friendly message if the file
 * is not a valid MacroTrack backup.
 */
export async function importBackup(): Promise<PersistShape | null> {
  const res = await DocumentPicker.getDocumentAsync({
    // Broad type + content validation: some sources tag .json as octet-stream,
    // which would make a strict filter hide the file in the picker.
    type: ["application/json", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled) return null;
  const asset = res.assets?.[0];
  if (!asset) return null;

  const raw = await FileSystem.readAsStringAsync(asset.uri);
  let envelope: BackupEnvelope;
  try {
    envelope = JSON.parse(raw) as BackupEnvelope;
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!envelope || envelope.magic !== MAGIC || !envelope.data) {
    throw new Error("That file isn't a MacroTrack backup.");
  }

  const shape = normalize(envelope.data);
  if (!shape) throw new Error("This backup is missing its profile data.");

  // Re-materialize inline photos as files; future schema bumps would migrate here.
  return migrateShapePhotos(shape);
}
