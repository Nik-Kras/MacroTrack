import * as FileSystem from 'expo-file-system';

export async function saveLocalImage(uri: string) {
  const directory = `${FileSystem.documentDirectory}images/`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
  const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const target = `${directory}${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}
