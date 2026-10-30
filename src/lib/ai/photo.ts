import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** Long edge shown to the model: enough to tell foods apart (as in MamaKcal). */
const LONG_EDGE = 1280;

/**
 * Resize a camera or gallery photo for the model. The result is a temporary JPEG
 * in the app's cache: a meal photo is not kept once the meal is logged.
 */
export async function prepareMealPhoto(src: string, width: number, height: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(src);
  if (Math.max(width, height) > LONG_EDGE) {
    ctx.resize(width >= height ? { width: LONG_EDGE, height: null } : { width: null, height: LONG_EDGE });
  }
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return out.uri;
}

/** Take a meal photo with the system camera, or pick one from the gallery. null = cancelled or no permission. */
export async function takeMealPhoto(source: "camera" | "library"): Promise<{ uri: string; width: number; height: number } | null> {
  const ImagePicker = await import("expo-image-picker");
  const perm =
    source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const opts = { mediaTypes: ["images" as const], quality: 0.9, allowsEditing: false };
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}
