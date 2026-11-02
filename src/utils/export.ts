import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export const shareTextFile = async (fileName: string, contents: string) => {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  }
  return file.uri;
};
