import React, { useState, useEffect, useRef } from 'react';
import { StreamSyncManager, SyncPacket, AnySyncMessage } from '../services/streamSync';
import { AvatarCanvas } from './AvatarCanvas';
import {
  loadAllCharacters,
  loadAppConfig,
  loadStadiumCustomImage,
  loadStadiumCustomVideo,
  loadAvatarMediaBlob,
} from '../services/characterStorage';
import {
  AspectRatioMode,
  BackgroundMode,
  Character,
  DualHostSettings,
  FaceData,
  LiveMode,
  StadiumBackgroundSettings,
  TrackingSettings,
} from '../types/vtuber';
import { CHARACTER_SLOTS, resolveCharacterMediaUrls } from '../utils/avatarMedia';

const NEUTRAL_FACE_DATA: FaceData = {
  detected: false,
  jawOpen: 0,
  eyeBlinkLeft: 0,
  eyeBlinkRight: 0,
  mouthSmile: 0,
  mouthPucker: 0,
  mouthFunnel: 0,
  mouthStretch: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
  timestamp: 0,
};

const FALLBACK_TRACKING_SETTINGS: TrackingSettings = {
  mouthSensitivity: 0.16,
  smoothing: 0.55,
  headIntensity: 0.85,
  mouthCloseDelay: 140,
  targetFps: 30,
  characterScale: 1.0,
  characterPosX: 50,
  characterPosY: 65,
};

const FALLBACK_DUAL_SETTINGS: DualHostSettings = {
  webcamWidthPercent: 42,
  webcamPosition: 'left',
  webcamRounded: true,
  webcamBorderColor: '#E51A24',
  webcamLabel: 'TELECRONISTA',
  avatarLabel: 'MISTER ROSSONERO',
};

export const CleanOutputView: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncPacket | null>(null);
  const [customStadiumImageUrl, setCustomStadiumImageUrl] = useState<string | null>(null);
  const [customStadiumVideoUrl, setCustomStadiumVideoUrl] = useState<string | null>(null);
  const [avatarMediaUrlMap, setAvatarMediaUrlMap] = useState<Record<string, string>>({});

  const lastReceivedRef = useRef<number>(0);
  const syncManagerRef = useRef<StreamSyncManager | null>(null);
  const reconnectIntervalRef = useRef<number | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const avatarMediaCacheRef = useRef<Record<string, string>>({});

  // Set permanent window title for TikTok LIVE Studio Window Capture
  useEffect(() => {
    document.title = 'TWINHITS FACECAM - LIVE OUTPUT';
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Pre-populate ONLY the exact persisted active character & scene from shared IndexedDB
    //    (never show a wrong fallback preset if activeCharacterId is unknown).
    const preloadFromSharedStorage = async () => {
      try {
        const [config, chars] = await Promise.all([loadAppConfig(), loadAllCharacters()]);
        if (!isMounted) return;

        const savedActiveId =
          typeof config.activeCharacterId === 'string'
            ? config.activeCharacterId
            : localStorage.getItem('twinhits_active_char_id') || '';

        if (!savedActiveId) return;

        const matchedChar: Character | undefined = chars.find((c) => c.id === savedActiveId);
        if (!matchedChar) return;

        const savedSettings =
          (config.settings as TrackingSettings | undefined) || FALLBACK_TRACKING_SETTINGS;
        const savedDual =
          (config.dualSettings as DualHostSettings | undefined) || FALLBACK_DUAL_SETTINGS;
        const savedLiveMode =
          (config.liveMode as LiveMode | undefined) ||
          (localStorage.getItem('twinhits_live_mode') as LiveMode) ||
          'solo';
        const savedAspect =
          (config.aspectRatio as AspectRatioMode | undefined) ||
          (localStorage.getItem('twinhits_aspect') as AspectRatioMode) ||
          '9:16';
        const savedBg =
          (config.backgroundMode as BackgroundMode | undefined) ||
          (localStorage.getItem('twinhits_bg') as BackgroundMode) ||
          'green';
        const savedStadiumBg = config.stadiumBgSettings as
          | StadiumBackgroundSettings
          | undefined;

        setSyncState((prev) => {
          if (prev?.character) return prev; // Live packet already arrived
          return {
            type: 'TWINHITS_SYNC_STATE',
            timestamp: performance.now(),
            character: matchedChar,
            faceData: { ...NEUTRAL_FACE_DATA, timestamp: performance.now() },
            settings: savedSettings,
            dualSettings: savedDual,
            liveMode: savedLiveMode,
            aspectRatio: savedAspect,
            backgroundMode: savedBg,
            stadiumBgSettings: savedStadiumBg,
          };
        });
      } catch (e) {
        console.warn('[CleanOutput] Impossibile leggere stato iniziale condiviso:', e);
      }
    };

    preloadFromSharedStorage();

    // 2. Initialize multi-window sync (BroadcastChannel + origin-verified postMessage)
    const manager = new StreamSyncManager((msg: AnySyncMessage) => {
      if (msg.type === 'TWINHITS_SYNC_STATE') {
        const packet = msg as SyncPacket;
        lastReceivedRef.current = Date.now();
        setSyncState(packet);
      }
    });

    syncManagerRef.current = manager;
    manager.requestState();

    // Fast startup handshake retries in case controller finished loading slightly after output
    const t1 = window.setTimeout(() => manager.requestState(), 250);
    const t2 = window.setTimeout(() => manager.requestState(), 800);

    // 3. Reconnection & stale-controller guard:
    //    If controller stops/reloads for >2.5s, relax avatar softly to SILENT without blanking scene,
    //    and periodically request full state so reconnection is instant when controller returns.
    reconnectIntervalRef.current = window.setInterval(() => {
      const sinceLast = Date.now() - lastReceivedRef.current;
      if (sinceLast > 2500) {
        manager.requestState();
        setSyncState((prev) => {
          if (!prev || !prev.faceData.detected) return prev;
          return {
            ...prev,
            faceData: { ...NEUTRAL_FACE_DATA, timestamp: performance.now() },
          };
        });
      }
    }, 1000);

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        manager.requestState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      if (reconnectIntervalRef.current) clearInterval(reconnectIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      manager.destroy();
    };
  }, []);

  // Load custom stadium image / video from shared IndexedDB whenever version or preset changes
  const customMediaVersion = syncState?.stadiumBgSettings?.customMediaVersion ?? 0;
  const stadiumPreset = syncState?.stadiumBgSettings?.preset ?? 'none';

  useEffect(() => {
    let isCancelled = false;

    const loadMedia = async () => {
      try {
        if (stadiumPreset === 'custom_image' || customMediaVersion > 0) {
          const img = await loadStadiumCustomImage();
          if (!isCancelled) {
            setCustomStadiumImageUrl(img);
          }
        }

        if (stadiumPreset === 'custom_video' || customMediaVersion > 0) {
          const blob = await loadStadiumCustomVideo();
          if (!isCancelled) {
            if (videoObjectUrlRef.current) {
              URL.revokeObjectURL(videoObjectUrlRef.current);
              videoObjectUrlRef.current = null;
            }
            if (blob) {
              const objUrl = URL.createObjectURL(blob);
              videoObjectUrlRef.current = objUrl;
              setCustomStadiumVideoUrl(objUrl);
            } else {
              setCustomStadiumVideoUrl(null);
            }
          }
        }
      } catch (err) {
        console.warn('[CleanOutput] Errore caricamento media stadio:', err);
      }
    };

    loadMedia();

    return () => {
      isCancelled = true;
    };
  }, [customMediaVersion, stadiumPreset]);

  // Load avatar WebM / large GIF blobs from shared IndexedDB whenever character mediaKeys change
  const activeCharMediaKeysJson = JSON.stringify(syncState?.character?.mediaKeys || {});

  useEffect(() => {
    const mediaKeys = syncState?.character?.mediaKeys;
    if (!mediaKeys) return;

    let cancelled = false;
    const missing: string[] = [];
    for (const slot of CHARACTER_SLOTS) {
      const k = mediaKeys[slot];
      if (k && !avatarMediaCacheRef.current[k] && !missing.includes(k)) {
        missing.push(k);
      }
    }
    if (missing.length === 0) return;

    const loadBlobs = async () => {
      const loaded: Record<string, string> = {};
      await Promise.all(
        missing.map(async (key) => {
          const blob = await loadAvatarMediaBlob(key);
          if (blob && !cancelled) {
            const url = URL.createObjectURL(blob);
            avatarMediaCacheRef.current[key] = url;
            loaded[key] = url;
          }
        })
      );
      if (!cancelled && Object.keys(loaded).length > 0) {
        setAvatarMediaUrlMap((prev) => ({ ...prev, ...loaded }));
      }
    };

    loadBlobs();

    return () => {
      cancelled = true;
    };
  }, [syncState?.character?.id, activeCharMediaKeysJson]);

  // Cleanup all ObjectURLs on unmount
  useEffect(() => {
    return () => {
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
      }
      Object.values(avatarMediaCacheRef.current).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      avatarMediaCacheRef.current = {};
    };
  }, []);

  // Pure clean surface if output opened before any character was ever synced/stored
  // Zero menus, zero buttons, zero technical text, and zero wrong fallback avatar.
  if (!syncState || !syncState.character) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-[#000000] select-none" />
    );
  }

  // Pure, clean synchronized output for TikTok LIVE Studio Window Capture
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex items-center justify-center select-none"
      style={{ backgroundColor: syncState.backgroundMode === 'green' ? '#00FF00' : '#000000' }}
    >
      <AvatarCanvas
        character={syncState.character}
        faceData={syncState.faceData}
        settings={syncState.settings}
        liveMode={syncState.liveMode}
        aspectRatio={syncState.aspectRatio}
        backgroundMode={syncState.backgroundMode}
        customBgColor={syncState.customBgColor}
        dualSettings={syncState.dualSettings}
        scenographySettings={syncState.scenographySettings}
        stadiumBgSettings={syncState.stadiumBgSettings}
        customStadiumImageUrl={customStadiumImageUrl}
        customStadiumVideoUrl={customStadiumVideoUrl}
        resolvedAvatarMediaUrls={resolveCharacterMediaUrls(syncState.character, avatarMediaUrlMap)}
        isCleanOutput={true}
      />
    </div>
  );
};
