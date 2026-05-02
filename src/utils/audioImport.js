import { parseBlob } from 'music-metadata-browser';
import { saveTrack, getAllTracks, deleteTrack, getTrack } from './offlineStorage';

let idCounter = Date.now();

function generateId() {
  return `local_${++idCounter}`;
}

export async function importFiles(files) {
  const results = [];

  for (const file of files) {
    try {
      const result = await importFile(file);
      results.push(result);
    } catch (err) {
      console.error('[audioImport] Failed to import:', file.name, err);
      results.push({ error: true, filename: file.name, message: err.message });
    }
  }

  return results;
}

async function importFile(file) {
  // Parse metadata
  let metadata;
  try {
    metadata = await parseBlob(file);
  } catch {
    metadata = null;
  }

  const title = metadata?.common?.title || file.name.replace(/\.[^.]+$/, '');
  const artist = metadata?.common?.artist || 'Unknown Artist';
  const album = metadata?.common?.album || '';
  const duration = metadata?.format?.duration || 0;

  // Extract artwork
  let artworkBlob = null;
  let artworkUrl = null;
  const picture = metadata?.common?.picture?.[0];
  if (picture) {
    artworkBlob = new Blob([picture.data], { type: picture.format });
    artworkUrl = URL.createObjectURL(artworkBlob);
  }

  const id = generateId();

  // Save to IndexedDB
  const objectUrl = await saveTrack(id, file, {
    title,
    artist,
    album,
    duration,
    coverUrl: artworkUrl,
    size: file.size
  });

  return {
    id,
    title,
    artist,
    album,
    duration,
    cover_url: artworkUrl,
    coverUrl: artworkUrl,
    size: file.size,
    source: 'offline',
    source_type: 'offline',
    objectUrl,
    dateAdded: Date.now()
  };
}

export async function getImportedSongs() {
  const tracks = await getAllTracks();
  return tracks.map(t => ({
    id: t.id,
    title: t.title || 'Unknown',
    artist: t.artist || 'Unknown Artist',
    album: t.album || '',
    duration: t.duration || 0,
    cover_url: t.coverUrl || null,
    coverUrl: t.coverUrl || null,
    size: t.size || 0,
    source: 'offline',
    source_type: 'offline',
    dateAdded: t.downloadedAt || Date.now()
  }));
}

export async function getOfflineSongForPlayback(id) {
  const track = await getTrack(id);
  if (!track) return null;
  return {
    id,
    title: track.metadata.title || 'Unknown',
    artist: track.metadata.artist || 'Unknown Artist',
    album: track.metadata.album || '',
    duration: track.metadata.duration || 0,
    cover_url: track.metadata.coverUrl || null,
    coverUrl: track.metadata.coverUrl || null,
    source: 'offline',
    source_type: 'offline',
    objectUrl: track.objectUrl,
    localBlobUrl: track.objectUrl
  };
}

export { deleteTrack, getAllTracks };
