import { Directory, File, Paths } from "expo-file-system";

const extensionFromUri = (uri: string) => {
  const clean = uri.split("?")[0] ?? uri;
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? "jpg";
};

export const persistLocalImage = (sourceUri: string, prefix: string) => {
  const imagesDir = new Directory(Paths.document, "images");
  if (!imagesDir.exists) {
    imagesDir.create({ idempotent: true, intermediates: true });
  }

  const extension = extensionFromUri(sourceUri);
  const target = new File(imagesDir, `${prefix}-${Date.now()}.${extension}`);
  const source = new File(sourceUri);
  source.copy(target);
  return target.uri;
};
