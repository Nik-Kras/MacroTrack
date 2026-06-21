import * as ImagePicker from "expo-image-picker";

/** Open the library and return a base64 data URI, or null if cancelled. */
export async function pickPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    base64: true,
    allowsEditing: true,
    aspect: [4, 3],
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  if (a.base64) return `data:image/jpeg;base64,${a.base64}`;
  return a.uri;
}
