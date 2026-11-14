import {
  Character,
  TrackingSettings,
  DualHostSettings,
  BackgroundMode,
  AspectRatioMode,
  LiveMode,
  StadiumBackgroundSettings,
} from '../types/vtuber';
import { DEFAULT_CHARACTERS } from '../utils/defaultCharacters';

const DB_NAME = 'TwinHitsFaceCamDB';
const DB_VERSION = 2;
const STORE_CHARACTERS = 'characters';
const STORE_CONFIG = 'config';
const STORE_AVATAR_MEDIA = 'avatar_media';

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CHARACTERS)) {
        db.createObjectStore(STORE_CHARACTERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_AVATAR_MEDIA)) {
        db.createObjectStore(STORE_AVATAR_MEDIA, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveCharacterToDB(character: Character): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHARACTERS, 'readwrite');
      const store = tx.objectStore(STORE_CHARACTERS);
      store.put(character);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Errore salvataggio IndexedDB, fallback localStorage', err);
    try {
      const raw = localStorage.getItem('twinhits_characters');
      const list: Character[] = raw ? JSON.parse(raw) : [];
      const updated = list.some((c) => c.id === character.id)
        ? list.map((c) => (c.id === character.id ? character : c))
        : [...list, character];
      localStorage.setItem('twinhits_characters', JSON.stringify(updated));
    } catch (e) {
      console.error('Fallback localStorage fallito', e);
    }
  }
}

export async function deleteCharacterFromDB(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHARACTERS, 'readwrite');
      const store = tx.objectStore(STORE_CHARACTERS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Errore eliminazione da IndexedDB', err);
  }
}

export async function loadAllCharacters(): Promise<Character[]> {
  try {
    const db = await getDB();
    const charsFromDB = await new Promise<Character[]>((resolve, reject) => {
      const tx = db.transaction(STORE_CHARACTERS, 'readonly');
      const store = tx.objectStore(STORE_CHARACTERS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (charsFromDB.length > 0) {
      // Merge default characters, allowing edited/custom entries to override by id without duplicates
      const customOnly = charsFromDB.filter((c) => !c.isPreset);
      const customIds = new Set(customOnly.map((c) => c.id));
      const presets = DEFAULT_CHARACTERS.filter((c) => !customIds.has(c.id));
      return [...presets, ...customOnly];
    }
  } catch (err) {
    console.warn('Caricamento da IndexedDB non riuscito, fallback localStorage', err);
  }

  // Fallback to localStorage or DEFAULT_CHARACTERS
  try {
    const saved = localStorage.getItem('twinhits_characters');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const customOnly = parsed.filter((c: Character) => !c.isPreset);
        return [...DEFAULT_CHARACTERS, ...customOnly];
      }
    }
  } catch (e) {
    console.warn('Fallback localStorage error', e);
  }

  return DEFAULT_CHARACTERS;
}

export async function saveAppConfig(config: {
  activeCharacterId?: string;
  settings?: TrackingSettings;
  dualSettings?: DualHostSettings;
  backgroundMode?: BackgroundMode;
  aspectRatio?: AspectRatioMode;
  liveMode?: LiveMode;
  stadiumBgSettings?: StadiumBackgroundSettings;
  isLayoutLocked?: boolean;
}): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_CONFIG, 'readwrite');
    const store = tx.objectStore(STORE_CONFIG);
    for (const [key, val] of Object.entries(config)) {
      if (val !== undefined) {
        store.put({ key, value: val });
      }
    }
  } catch (e) {
    console.warn('Impossibile salvare config su IndexedDB', e);
  }
}

export async function loadAppConfig(): Promise<Record<string, unknown>> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CONFIG, 'readonly');
      const store = tx.objectStore(STORE_CONFIG);
      const req = store.getAll();
      req.onsuccess = () => {
        const res: Record<string, unknown> = {};
        for (const item of req.result || []) {
          res[item.key] = item.value;
        }
        resolve(res);
      };
      req.onerror = () => resolve({});
    });
  } catch (e) {
    return {};
  }
}

const KEY_STADIUM_CUSTOM_IMAGE = 'stadium_custom_image';
const KEY_STADIUM_CUSTOM_VIDEO = 'stadium_custom_video';

export async function saveStadiumCustomImage(dataUrl: string | null): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONFIG, 'readwrite');
      const store = tx.objectStore(STORE_CONFIG);
      if (dataUrl) {
        store.put({ key: KEY_STADIUM_CUSTOM_IMAGE, value: dataUrl });
      } else {
        store.delete(KEY_STADIUM_CUSTOM_IMAGE);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Impossibile salvare immagine stadio personalizzata in IndexedDB', e);
  }
}

export async function loadStadiumCustomImage(): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CONFIG, 'readonly');
      const store = tx.objectStore(STORE_CONFIG);
      const req = store.get(KEY_STADIUM_CUSTOM_IMAGE);
      req.onsuccess = () => resolve(typeof req.result?.value === 'string' ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function saveStadiumCustomVideo(blob: Blob | null): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONFIG, 'readwrite');
      const store = tx.objectStore(STORE_CONFIG);
      if (blob) {
        store.put({ key: KEY_STADIUM_CUSTOM_VIDEO, value: blob });
      } else {
        store.delete(KEY_STADIUM_CUSTOM_VIDEO);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Impossibile salvare video stadio personalizzato in IndexedDB', e);
  }
}

export async function loadStadiumCustomVideo(): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CONFIG, 'readonly');
      const store = tx.objectStore(STORE_CONFIG);
      const req = store.get(KEY_STADIUM_CUSTOM_VIDEO);
      req.onsuccess = () => resolve(req.result?.value instanceof Blob ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function saveAvatarMediaBlob(key: string, blob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AVATAR_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_AVATAR_MEDIA);
    store.put({ key, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAvatarMediaBlob(key: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AVATAR_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_AVATAR_MEDIA);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result?.blob instanceof Blob ? req.result.blob : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function deleteAvatarMediaBlob(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AVATAR_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_AVATAR_MEDIA);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    // ignore
  }
}

