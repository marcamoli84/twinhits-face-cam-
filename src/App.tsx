/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Character,
  FaceData,
  TrackingSettings,
  LiveMode,
  AspectRatioMode,
  BackgroundMode,
  DualHostSettings,
  ScenographySettings,
  StadiumBackgroundSettings,
  StadiumBackgroundPreset,
  CharacterSlotKey,
} from './types/vtuber';
import { DEFAULT_CHARACTERS } from './utils/defaultCharacters';
import { CHARACTER_SLOTS, resolveCharacterMediaUrls } from './utils/avatarMedia';
import {
  getFaceLandmarker,
  extractFaceData,
  getCurrentDelegate,
} from './services/mediapipeService';
import { AvatarCanvas } from './components/AvatarCanvas';
import { ControlPanel } from './components/ControlPanel';
import { LiveHUD } from './components/LiveHUD';
import { CharacterModal } from './components/CharacterModal';
import { TikTokStudioGuide } from './components/TikTokStudioGuide';
import { CleanOutputView } from './components/CleanOutputView';
import { StreamSyncManager, SyncPacket } from './services/streamSync';
import {
  loadAllCharacters,
  saveCharacterToDB,
  deleteCharacterFromDB,
  saveAppConfig,
  loadAppConfig,
  saveStadiumCustomImage,
  loadStadiumCustomImage,
  saveStadiumCustomVideo,
  loadStadiumCustomVideo,
  saveAvatarMediaBlob,
  loadAvatarMediaBlob,
  deleteAvatarMediaBlob,
} from './services/characterStorage';
import {
  Radio,
  Maximize2,
  Minimize2,
  Tv,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const DEFAULT_SETTINGS: TrackingSettings = {
  mouthSensitivity: 0.16,
  smoothing: 0.55,
  headIntensity: 0.85,
  mouthCloseDelay: 140,
  targetFps: 30,
  characterScale: 1.0,
  characterPosX: 50,
  characterPosY: 65,
};

const DEFAULT_DUAL_SETTINGS: DualHostSettings = {
  webcamWidthPercent: 42,
  webcamPosition: 'left',
  webcamRounded: true,
  webcamBorderColor: '#E51A24',
  webcamLabel: 'TELECRONISTA',
  avatarLabel: 'MISTER ROSSONERO',
};

const DEFAULT_SCENOGRAPHY_SETTINGS: ScenographySettings = {
  enabled: true,
  theme: 'san_siro_twinhits',
  motionIntensity: 1.0,
  brightness: 1.0,
  smokeIntensity: 0.55,
  speed: 1.0,
  isFrozen: false,
  showLedBoard: true,
  ledText: 'TWINHITS • LIVE STADIUM • TELECRONACA ROSSONERA • TWINHITS',
};

const DEFAULT_STADIUM_BG_SETTINGS: StadiumBackgroundSettings = {
  preset: 'none',
  opacity: 1.0,
  blur: 0,
  brightness: 0.9,
  overlayDarkness: 0.35,
  customMediaVersion: 0,
};

// Optimize uploaded background image (cap at 1920px while preserving aspect ratio for smooth FPS)
function processStadiumImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Errore lettura file immagine'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const MAX_DIM = 1920;
        if (img.width <= MAX_DIM && img.height <= MAX_DIM && file.size < 1.5 * 1024 * 1024) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// Check if this window was opened specifically as the clean output stream
const isOutputWindowMode =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('mode') === 'output';

export default function App() {
  // If in Output Window Mode: render the pure, dedicated CleanOutputView immediately!
  if (isOutputWindowMode) {
    return <CleanOutputView />;
  }

  return <StudioMasterView />;
}

// Main Studio Window Component (Camera tracking, controls, management)
function StudioMasterView() {
  // Characters state
  const [characters, setCharacters] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem('twinhits_characters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const customChars = parsed.filter((c: Character) => !c.isPreset);
          return [...DEFAULT_CHARACTERS, ...customChars];
        }
      }
    } catch (e) {
      console.warn('Impossibile caricare personaggi salvati', e);
    }
    return DEFAULT_CHARACTERS;
  });

  const [activeCharacterId, setActiveCharacterId] = useState<string>(() => {
    const saved = localStorage.getItem('twinhits_active_char_id');
    return saved || DEFAULT_CHARACTERS[0].id;
  });

  // Settings
  const [settings, setSettings] = useState<TrackingSettings>(() => {
    try {
      const saved = localStorage.getItem('twinhits_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Impossibile caricare impostazioni salvate', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Dual Host settings
  const [dualSettings, setDualSettings] = useState<DualHostSettings>(() => {
    try {
      const saved = localStorage.getItem('twinhits_dual_settings');
      if (saved) return { ...DEFAULT_DUAL_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Impossibile caricare dual settings', e);
    }
    return DEFAULT_DUAL_SETTINGS;
  });

  // Live broadcast modes
  const [liveMode, setLiveMode] = useState<LiveMode>(() => {
    return (localStorage.getItem('twinhits_live_mode') as LiveMode) || 'solo';
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>(() => {
    return (localStorage.getItem('twinhits_aspect') as AspectRatioMode) || '9:16';
  });
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(() => {
    return (localStorage.getItem('twinhits_bg') as BackgroundMode) || 'green'; // Default green for immediate TikTok chroma key
  });

  // Scenography Settings
  const [scenographySettings, setScenographySettings] = useState<ScenographySettings>(() => {
    try {
      const saved = localStorage.getItem('twinhits_scenography');
      if (saved) return { ...DEFAULT_SCENOGRAPHY_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Errore lettura scenografia salvata', e);
    }
    return DEFAULT_SCENOGRAPHY_SETTINGS;
  });

  // Realistic Stadium Background Settings & Media URLs
  const [stadiumBgSettings, setStadiumBgSettings] = useState<StadiumBackgroundSettings>(() => {
    try {
      const saved = localStorage.getItem('twinhits_stadium_bg');
      if (saved) return { ...DEFAULT_STADIUM_BG_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Errore lettura sfondo stadio salvato', e);
    }
    return DEFAULT_STADIUM_BG_SETTINGS;
  });
  const [customStadiumImageUrl, setCustomStadiumImageUrl] = useState<string | null>(null);
  const [customStadiumVideoUrl, setCustomStadiumVideoUrl] = useState<string | null>(null);
  const stadiumVideoObjectUrlRef = useRef<string | null>(null);
  const [avatarMediaUrlMap, setAvatarMediaUrlMap] = useState<Record<string, string>>({});
  const avatarMediaUrlCacheRef = useRef<Record<string, string>>({});

  // Layout lock state (blocks format, scale, X/Y position, background, and live composition)
  const [isLayoutLocked, setIsLayoutLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('twinhits_layout_locked') === 'true';
    } catch {
      return false;
    }
  });
  const isLayoutLockedRef = useRef<boolean>(isLayoutLocked);
  isLayoutLockedRef.current = isLayoutLocked;

  // Tracking & Webcam state
  const [isTracking, setIsTracking] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isLoadingMediaPipe, setIsLoadingMediaPipe] = useState(false);
  const [initProgress, setInitProgress] = useState('');
  const [realFps, setRealFps] = useState(0);
  const [delegateMode, setDelegateMode] = useState<'GPU' | 'CPU'>('CPU');

  // Simulation test mode (useful if camera is blocked or offline)
  const [isSimulating, setIsSimulating] = useState(false);

  // Modals & Clean views (isCleanFullscreen is intentionally non-persistent across reloads)
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isTikTokGuideOpen, setIsTikTokGuideOpen] = useState(false);
  const [isCleanFullscreen, setIsCleanFullscreen] = useState(false);
  const [isLiveExitHovered, setIsLiveExitHovered] = useState(false);

  const studioRootRef = useRef<HTMLDivElement | null>(null);
  const isCleanFullscreenRef = useRef<boolean>(false);
  isCleanFullscreenRef.current = isCleanFullscreen;
  const wasBrowserFullscreenRef = useRef<boolean>(false);

  const enterLiveMode = useCallback(() => {
    setIsLiveExitHovered(false);
    setIsCleanFullscreen(true);
    requestAnimationFrame(() => {
      studioRootRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const exitLiveMode = useCallback(() => {
    setIsLiveExitHovered(false);
    setIsCleanFullscreen(false);
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    if (doc.fullscreenElement) {
      doc.exitFullscreen?.().catch(() => {});
    } else if (doc.webkitFullscreenElement) {
      doc.webkitExitFullscreen?.();
    }
  }, []);

  const toggleLiveMode = useCallback(() => {
    if (isCleanFullscreenRef.current) {
      exitLiveMode();
    } else {
      enterLiveMode();
    }
  }, [enterLiveMode, exitLiveMode]);

  // Global keyboard shortcuts (ESC exits LIVE, CTRL+SHIFT+L toggles LIVE) & fullscreenchange sync
  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    wasBrowserFullscreenRef.current = Boolean(
      doc.fullscreenElement || doc.webkitFullscreenElement
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape') {
        if (isCleanFullscreenRef.current) {
          e.preventDefault();
          e.stopPropagation();
          exitLiveMode();
        }
        return;
      }

      if (
        !e.repeat &&
        e.ctrlKey &&
        e.shiftKey &&
        (e.key.toLowerCase() === 'l' || e.code === 'KeyL')
      ) {
        e.preventDefault();
        e.stopPropagation();
        toggleLiveMode();
      }
    };

    const handleFullscreenChange = () => {
      const isNowBrowserFullscreen = Boolean(
        doc.fullscreenElement || doc.webkitFullscreenElement
      );
      if (
        wasBrowserFullscreenRef.current &&
        !isNowBrowserFullscreen &&
        isCleanFullscreenRef.current
      ) {
        exitLiveMode();
      }
      wasBrowserFullscreenRef.current = isNowBrowserFullscreen;
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [exitLiveMode, toggleLiveMode]);

  // Reveal "ESCI DALLA MODALITÀ LIVE" button only when cursor moves into the top-right zone
  useEffect(() => {
    if (!isCleanFullscreen) {
      setIsLiveExitHovered(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const inTopRightZone =
        e.clientX >= Math.max(0, window.innerWidth - 300) && e.clientY <= 120;
      setIsLiveExitHovered((prev) => (prev === inTopRightZone ? prev : inTopRightZone));
    };

    const handleMouseLeave = () => {
      setIsLiveExitHovered(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isCleanFullscreen]);

  // Live face data
  const [faceData, setFaceData] = useState<FaceData>({
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
  });

  // Refs
  const faceDataRef = useRef<FaceData>(faceData);
  faceDataRef.current = faceData;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef<{ frames: number; lastTime: number }>({ frames: 0, lastTime: performance.now() });
  const syncManagerRef = useRef<StreamSyncManager | null>(null);
  const popoutWindowRef = useRef<Window | null>(null);
  const landmarkerRef = useRef<any>(null);

  // Active character object & stable refs for zero-stale BroadcastChannel sync
  const activeCharacter =
    characters.find((c) => c.id === activeCharacterId) || characters[0] || DEFAULT_CHARACTERS[0];

  const activeCharacterRef = useRef<Character>(activeCharacter);
  activeCharacterRef.current = activeCharacter;
  const settingsRef = useRef<TrackingSettings>(settings);
  settingsRef.current = settings;
  const dualSettingsRef = useRef<DualHostSettings>(dualSettings);
  dualSettingsRef.current = dualSettings;
  const liveModeRef = useRef<LiveMode>(liveMode);
  liveModeRef.current = liveMode;
  const aspectRatioRef = useRef<AspectRatioMode>(aspectRatio);
  aspectRatioRef.current = aspectRatio;
  const backgroundModeRef = useRef<BackgroundMode>(backgroundMode);
  backgroundModeRef.current = backgroundMode;
  const scenographySettingsRef = useRef<ScenographySettings>(scenographySettings);
  scenographySettingsRef.current = scenographySettings;
  const stadiumBgSettingsRef = useRef<StadiumBackgroundSettings>(stadiumBgSettings);
  stadiumBgSettingsRef.current = stadiumBgSettings;

  // Initialize and load from IndexedDB on startup
  useEffect(() => {
    const initStorage = async () => {
      try {
        const storedChars = await loadAllCharacters();
        if (storedChars.length > 0) {
          setCharacters(storedChars);
        }
        const cfg = await loadAppConfig();
        if (cfg.activeCharacterId && typeof cfg.activeCharacterId === 'string') {
          setActiveCharacterId(cfg.activeCharacterId);
        }
        if (typeof cfg.isLayoutLocked === 'boolean') {
          setIsLayoutLocked(cfg.isLayoutLocked);
        }

        const [storedStadiumImg, storedStadiumVideo] = await Promise.all([
          loadStadiumCustomImage(),
          loadStadiumCustomVideo(),
        ]);
        if (storedStadiumImg) {
          setCustomStadiumImageUrl(storedStadiumImg);
        }
        if (storedStadiumVideo) {
          if (stadiumVideoObjectUrlRef.current) {
            URL.revokeObjectURL(stadiumVideoObjectUrlRef.current);
          }
          const objUrl = URL.createObjectURL(storedStadiumVideo);
          stadiumVideoObjectUrlRef.current = objUrl;
          setCustomStadiumVideoUrl(objUrl);
        }
      } catch (e) {
        console.warn('Inizializzazione storage non riuscita', e);
      }
    };
    initStorage();

    return () => {
      if (stadiumVideoObjectUrlRef.current) {
        URL.revokeObjectURL(stadiumVideoObjectUrlRef.current);
      }
      Object.values(avatarMediaUrlCacheRef.current).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      avatarMediaUrlCacheRef.current = {};
    };
  }, []);

  // Load any WebM / large GIF Blobs referenced by character.mediaKeys from IndexedDB
  useEffect(() => {
    let cancelled = false;
    const missingKeys: string[] = [];

    for (const char of characters) {
      if (!char.mediaKeys) continue;
      for (const slot of CHARACTER_SLOTS) {
        const k = char.mediaKeys[slot];
        if (k && !avatarMediaUrlCacheRef.current[k] && !missingKeys.includes(k)) {
          missingKeys.push(k);
        }
      }
    }

    if (missingKeys.length === 0) return;

    const loadMissing = async () => {
      const newlyLoaded: Record<string, string> = {};
      await Promise.all(
        missingKeys.map(async (key) => {
          const blob = await loadAvatarMediaBlob(key);
          if (blob && !cancelled) {
            const url = URL.createObjectURL(blob);
            avatarMediaUrlCacheRef.current[key] = url;
            newlyLoaded[key] = url;
          }
        })
      );
      if (!cancelled && Object.keys(newlyLoaded).length > 0) {
        setAvatarMediaUrlMap((prev) => ({ ...prev, ...newlyLoaded }));
      }
    };

    loadMissing();

    return () => {
      cancelled = true;
    };
  }, [characters]);

  // Save scenography & stadium background settings
  useEffect(() => {
    localStorage.setItem('twinhits_scenography', JSON.stringify(scenographySettings));
  }, [scenographySettings]);

  useEffect(() => {
    localStorage.setItem('twinhits_stadium_bg', JSON.stringify(stadiumBgSettings));
    saveAppConfig({ stadiumBgSettings });
  }, [stadiumBgSettings]);

  // Broadcast function reading fresh refs so StreamSyncManager never needs to be recreated
  const broadcastCurrentState = useCallback(
    (customFace?: FaceData, overrideCharacter?: Character) => {
      if (!syncManagerRef.current) return;

      const currentFace = customFace || faceDataRef.current;
      const packet: SyncPacket = {
        type: 'TWINHITS_SYNC_STATE',
        timestamp: performance.now(),
        character: overrideCharacter || activeCharacterRef.current,
        faceData: currentFace,
        settings: settingsRef.current,
        dualSettings: dualSettingsRef.current,
        liveMode: liveModeRef.current,
        aspectRatio: aspectRatioRef.current,
        backgroundMode: backgroundModeRef.current,
        scenographySettings: scenographySettingsRef.current,
        stadiumBgSettings: stadiumBgSettingsRef.current,
      };

      syncManagerRef.current.broadcastState(packet);
    },
    []
  );

  // Persist layout lock state
  useEffect(() => {
    try {
      localStorage.setItem('twinhits_layout_locked', String(isLayoutLocked));
    } catch {
      // ignore
    }
    saveAppConfig({ isLayoutLocked });
  }, [isLayoutLocked]);

  // Initialize StreamSyncManager ONCE so BroadcastChannel & targetWindow stay alive across state changes
  useEffect(() => {
    const manager = new StreamSyncManager((msg) => {
      if (msg.type === 'TWINHITS_REQUEST_STATE') {
        broadcastCurrentState();
      }
    });

    syncManagerRef.current = manager;
    if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
      manager.setTargetWindow(popoutWindowRef.current);
    }

    return () => {
      manager.destroy();
      syncManagerRef.current = null;
    };
  }, [broadcastCurrentState]);

  // Keep-alive heartbeat: broadcast state every 300ms so output window stays synced & recovers cleanly
  useEffect(() => {
    broadcastCurrentState();
    const interval = setInterval(() => {
      broadcastCurrentState();
    }, 300);

    return () => clearInterval(interval);
  }, [broadcastCurrentState]);

  // Persist state updates to localStorage & IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem('twinhits_characters', JSON.stringify(characters));
    } catch (e) {
      console.warn('localStorage quota raggiunta per personaggi, salvataggio attivo su IndexedDB', e);
    }
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('twinhits_active_char_id', activeCharacterId);
    saveAppConfig({ activeCharacterId });
  }, [activeCharacterId]);

  useEffect(() => {
    localStorage.setItem('twinhits_settings', JSON.stringify(settings));
    saveAppConfig({ settings });
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('twinhits_dual_settings', JSON.stringify(dualSettings));
    saveAppConfig({ dualSettings });
  }, [dualSettings]);

  useEffect(() => {
    localStorage.setItem('twinhits_live_mode', liveMode);
    saveAppConfig({ liveMode });
  }, [liveMode]);

  useEffect(() => {
    localStorage.setItem('twinhits_aspect', aspectRatio);
    saveAppConfig({ aspectRatio });
  }, [aspectRatio]);

  useEffect(() => {
    localStorage.setItem('twinhits_bg', backgroundMode);
    saveAppConfig({ backgroundMode });
  }, [backgroundMode]);

  // Enumerate USB & connected webcams (highlighting UGREEN AI Camera)
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setCameraError('Dispositivi multimediali non supportati dal browser');
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Telecamera ${index + 1}`,
        }));

      setAvailableDevices(videoDevs);

      // Auto-select UGREEN AI Camera if present, or first camera
      if (videoDevs.length > 0 && !selectedDeviceId) {
        const ugreenCam = videoDevs.find((d) => d.label.toLowerCase().includes('ugreen'));
        setSelectedDeviceId(ugreenCam ? ugreenCam.deviceId : videoDevs[0].deviceId);
      }
    } catch (err: unknown) {
      console.warn('Errore enumerazione dispositivi:', err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const isStartingCameraRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setWebcamStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Release hardware webcam lock cleanly on unmount / page unload (Windows 11 Chrome)
  useEffect(() => {
    const handleUnload = () => {
      stopCamera();
    };
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
      stopCamera();
    };
  }, [stopCamera]);

  // Start / Stop Webcam Stream with resilient fallback ladder for Windows 11 & Chrome
  const startCamera = async (deviceId?: string) => {
    if (isStartingCameraRef.current) return false;
    isStartingCameraRef.current = true;
    setCameraError(null);
    try {
      // 1. Thoroughly stop existing tracks and detach video element
      stopCamera();

      // Windows DirectShow/MediaFoundation exclusive lock release delay
      await new Promise((r) => setTimeout(r, 250));

      let stream: MediaStream | null = null;
      let lastErr: unknown = null;

      // Attempt 1: Exact device if selected, 1280x720 ideal
      try {
        const primaryConstraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        };
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (err1) {
        lastErr = err1;
        const msg1 = err1 instanceof Error ? err1.message : String(err1);
        console.warn('Tentativo primario webcam fallito:', msg1);

        const isPermissionErr =
          msg1.includes('NotAllowedError') || msg1.includes('Permission');

        // Attempt 2: Try lower/default constraints on the same device (helps if HD profile locks device)
        if (deviceId && !isPermissionErr) {
          await new Promise((r) => setTimeout(r, 250));
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { ideal: deviceId },
                width: { ideal: 640 },
                height: { ideal: 480 },
              },
              audio: false,
            });
          } catch (err2) {
            lastErr = err2;
            console.warn('Tentativo fallback ideal fallito:', err2);
          }
        }

        // Attempt 3: Try other enumerated videoinput devices (e.g. SplitCam / secondary camera if primary is busy)
        if (!stream && !isPermissionErr && navigator.mediaDevices?.enumerateDevices) {
          try {
            const devs = await navigator.mediaDevices.enumerateDevices();
            const altCams = devs
              .filter((d) => d.kind === 'videoinput' && d.deviceId && d.deviceId !== deviceId)
              .sort((a, b) => {
                const aPref = /splitcam|ugreen/i.test(a.label || '') ? 0 : 1;
                const bPref = /splitcam|ugreen/i.test(b.label || '') ? 0 : 1;
                return aPref - bPref;
              });

            for (const cam of altCams) {
              try {
                await new Promise((r) => setTimeout(r, 150));
                stream = await navigator.mediaDevices.getUserMedia({
                  video: { deviceId: { exact: cam.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
                  audio: false,
                });
                if (stream) break;
              } catch (altErr) {
                lastErr = altErr;
              }
            }
          } catch {
            // ignore enumerate fallback error
          }
        }

        // Attempt 4: General default video constraint if still failing
        if (!stream && !isPermissionErr) {
          await new Promise((r) => setTimeout(r, 200));
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (err4) {
            lastErr = err4;
          }
        }
      }

      if (!stream) {
        throw lastErr || new Error('Impossibile accedere alla webcam');
      }

      streamRef.current = stream;
      setWebcamStream(stream);

      const primaryVideoTrack = stream.getVideoTracks()[0];
      if (primaryVideoTrack) {
        primaryVideoTrack.onended = () => {
          if (streamRef.current !== stream) return;
          setIsTracking(false);
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          stopCamera();
          const resetFace: FaceData = {
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
            timestamp: performance.now(),
          };
          setFaceData(resetFace);
          broadcastCurrentState(resetFace);
          setCameraError('Segnale webcam interrotto. Verifica il cavo USB o premi Riprova Webcam.');
        };
      }

      const activeTrackDeviceId = primaryVideoTrack?.getSettings?.().deviceId;
      if (activeTrackDeviceId && activeTrackDeviceId !== selectedDeviceId) {
        setSelectedDeviceId(activeTrackDeviceId);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await refreshDevices();
      return true;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Avvio webcam non riuscito:', errMsg);
      const lower = errMsg.toLowerCase();

      const isDeviceInUse =
        lower.includes('device in use') ||
        lower.includes('notreadableerror') ||
        lower.includes('could not start video source') ||
        lower.includes('busy') ||
        lower.includes('concurrent') ||
        lower.includes('in uso') ||
        lower.includes('occupat');

      if (isDeviceInUse) {
        setCameraError(
          'Webcam occupata da un’altra applicazione (Device in use). In Windows le webcam USB consentono una sola applicazione attiva alla volta: disattiva la telecamera in TikTok LIVE Studio o OBS prima di avviarla qui, oppure usa la modalità Test Simulazione.'
        );
      } else if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setCameraError(
          'Permesso fotocamera negato dal browser. Consenti l’accesso cliccando sull’icona del lucchetto nella barra degli indirizzi di Chrome.'
        );
      } else if (errMsg.includes('NotFound') || errMsg.includes('DevicesNotFoundError')) {
        setCameraError('Nessuna webcam USB rilevata. Collega la fotocamera o usa la Modalità Test Simulazione.');
      } else {
        setCameraError(`Errore webcam: ${errMsg}`);
      }
      return false;
    } finally {
      isStartingCameraRef.current = false;
    }
  };

  // Main Detection Loop using detectForVideo
  const runDetectionLoop = useCallback(async () => {
    if (!isTracking) return;

    try {
      setIsLoadingMediaPipe(true);
      setInitProgress('Caricamento MediaPipe Face Landmarker...');
      const landmarker = await getFaceLandmarker({
        preferGpu: true, // Try GPU (WebGL) first; falls back smoothly to CPU for PCs without dedicated GPU
        onProgress: (p) => setInitProgress(p),
      });
      landmarkerRef.current = landmarker;
      setDelegateMode(getCurrentDelegate());
      setIsLoadingMediaPipe(false);

      const detectFrame = () => {
        if (!isTracking) return;

        const now = performance.now();
        const targetInterval = 1000 / Math.max(15, settingsRef.current.targetFps);
        const elapsedSinceLast = now - lastDetectionTimeRef.current;

        if (elapsedSinceLast >= targetInterval) {
          lastDetectionTimeRef.current = now;

          const video = videoRef.current;
          if (video && video.readyState >= 2 && !video.paused) {
            try {
              const result = landmarker.detectForVideo(video, now);
              const extracted = extractFaceData(result, now);
              setFaceData(extracted);
              broadcastCurrentState(extracted);

              fpsCounterRef.current.frames++;
              if (now - fpsCounterRef.current.lastTime >= 1000) {
                setRealFps(fpsCounterRef.current.frames);
                fpsCounterRef.current.frames = 0;
                fpsCounterRef.current.lastTime = now;
              }
            } catch {
              // Gracefully continue
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(detectFrame);
      };

      detectFrame();
    } catch (err: unknown) {
      setIsLoadingMediaPipe(false);
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(`Inizializzazione MediaPipe fallita: ${msg}`);
      setIsTracking(false);
    }
  }, [isTracking, broadcastCurrentState]);

  // Keep tracking alive even when the browser tab is blurred or backgrounded
  useEffect(() => {
    let backgroundInterval: number | null = null;

    const handleVisibilityChange = () => {
      if (backgroundInterval) {
        clearInterval(backgroundInterval);
        backgroundInterval = null;
      }
      if (document.hidden && isTracking) {
        backgroundInterval = window.setInterval(() => {
          const video = videoRef.current;
          const landmarker = landmarkerRef.current;
          if (video && video.readyState >= 2 && !video.paused && landmarker) {
            try {
              const now = performance.now();
              const result = landmarker.detectForVideo(video, now);
              const extracted = extractFaceData(result, now);
              setFaceData(extracted);
              broadcastCurrentState(extracted);
            } catch {
              // ignore
            }
          }
        }, 1000 / Math.max(15, settingsRef.current.targetFps));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (backgroundInterval) clearInterval(backgroundInterval);
    };
  }, [isTracking, broadcastCurrentState]);

  // Handle tracking toggle
  const handleToggleTracking = async () => {
    if (isTracking) {
      setIsTracking(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopCamera();
      const resetFace = { ...faceDataRef.current, detected: false, jawOpen: 0 };
      setFaceData(resetFace);
      broadcastCurrentState(resetFace);
    } else {
      const ok = await startCamera(selectedDeviceId);
      if (ok) {
        setIsTracking(true);
      }
    }
  };

  const handleRetryCamera = async () => {
    setIsTracking(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    stopCamera();
    await new Promise((r) => setTimeout(r, 250));
    const ok = await startCamera(selectedDeviceId);
    if (ok) {
      setIsTracking(true);
    }
  };

  const handleStartSimulation = () => {
    setIsTracking(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    stopCamera();
    setCameraError(null);
    setIsSimulating(true);
  };

  useEffect(() => {
    if (isTracking) {
      runDetectionLoop();
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isTracking, runDetectionLoop]);

  const handleSelectDevice = async (devId: string) => {
    setSelectedDeviceId(devId);
    if (isTracking) {
      await startCamera(devId);
    }
  };

  // Simulation test mode
  useEffect(() => {
    if (!isSimulating) return;

    let simTimer: number;
    let angle = 0;

    const tick = () => {
      angle += 0.08;
      const simJaw = Math.max(0, Math.sin(angle * 1.5) * 0.45);
      const simRoll = Math.sin(angle * 0.7) * 4.5;
      const simPitch = Math.cos(angle * 0.5) * 2.5;

      const simData: FaceData = {
        detected: true,
        jawOpen: simJaw,
        eyeBlinkLeft: 0,
        eyeBlinkRight: 0,
        mouthSmile: 0.2,
        mouthPucker: 0,
        pitch: simPitch,
        yaw: simRoll * 0.8,
        roll: simRoll,
        timestamp: performance.now(),
      };

      setFaceData(simData);
      broadcastCurrentState(simData);
      simTimer = requestAnimationFrame(tick);
    };

    simTimer = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(simTimer);
  }, [isSimulating, broadcastCurrentState]);

  // Character operations
  const handleSaveCharacter = async (
    char: Character,
    pendingMediaBlobs?: Partial<Record<CharacterSlotKey, Blob>>
  ) => {
    // 1. Store any pending video/GIF blobs in IndexedDB and cache object URLs immediately
    if (pendingMediaBlobs && char.mediaKeys) {
      const newlyCreatedUrls: Record<string, string> = {};
      for (const slot of CHARACTER_SLOTS) {
        const blob = pendingMediaBlobs[slot];
        const key = char.mediaKeys[slot];
        if (blob && key) {
          await saveAvatarMediaBlob(key, blob);
          const url = URL.createObjectURL(blob);
          avatarMediaUrlCacheRef.current[key] = url;
          newlyCreatedUrls[key] = url;
        }
      }
      if (Object.keys(newlyCreatedUrls).length > 0) {
        setAvatarMediaUrlMap((prev) => ({ ...prev, ...newlyCreatedUrls }));
      }
    }

    await saveCharacterToDB(char);
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === char.id);
      if (exists) {
        return prev.map((c) => (c.id === char.id ? char : c));
      }
      return [...prev, char];
    });
    // If saving the active character, immediately synchronize output with fresh character data
    if (char.id === activeCharacterId) {
      activeCharacterRef.current = char;
      broadcastCurrentState(undefined, char);
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    const target = characters.find((c) => c.id === id);
    if (target?.mediaKeys) {
      for (const slot of CHARACTER_SLOTS) {
        const k = target.mediaKeys[slot];
        if (k) {
          await deleteAvatarMediaBlob(k);
        }
      }
    }
    await deleteCharacterFromDB(id);
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (activeCharacterId === id) {
      const fallback = DEFAULT_CHARACTERS[0];
      setActiveCharacterId(fallback.id);
      activeCharacterRef.current = fallback;
      broadcastCurrentState(undefined, fallback);
    }
  };

  const handleSelectCharacter = (id: string) => {
    setActiveCharacterId(id);
    const chosen = characters.find((c) => c.id === id);
    if (chosen) {
      activeCharacterRef.current = chosen;
      broadcastCurrentState(undefined, chosen);
    }
  };

  // Open or focus Popout Clean Output Window without duplicating/reloading if already open
  const handleOpenPopoutWindow = () => {
    const existing = popoutWindowRef.current;
    if (existing && !existing.closed) {
      try {
        existing.focus();
      } catch {
        // ignore focus error
      }
      if (syncManagerRef.current) {
        syncManagerRef.current.setTargetWindow(existing);
      }
      broadcastCurrentState();
      return;
    }

    const baseWidth = aspectRatio === '9:16' ? 720 : 1280;
    const baseHeight = aspectRatio === '9:16' ? 1280 : 720;
    const maxAvailWidth = Math.max(360, (window.screen.availWidth || 1280) - 48);
    const maxAvailHeight = Math.max(480, (window.screen.availHeight || 800) - 72);
    const fitScale = Math.min(1, maxAvailWidth / baseWidth, maxAvailHeight / baseHeight);
    const width = Math.round(baseWidth * fitScale);
    const height = Math.round(baseHeight * fitScale);
    const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));

    const popout = window.open(
      `${window.location.origin}${window.location.pathname}?mode=output`,
      'TWINHITS_FACECAM_OUTPUT',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,status=no,resizable=yes`
    );

    if (popout) {
      popoutWindowRef.current = popout;
      if (syncManagerRef.current) {
        syncManagerRef.current.setTargetWindow(popout);
      }
      broadcastCurrentState();
      setTimeout(() => broadcastCurrentState(), 200);
      setTimeout(() => broadcastCurrentState(), 600);
      setTimeout(() => broadcastCurrentState(), 1200);
    } else {
      setIsCleanFullscreen(true);
    }
  };

  // Stadium Background Handlers (respecting Layout Lock)
  const handleSelectStadiumPreset = (preset: StadiumBackgroundPreset) => {
    if (isLayoutLockedRef.current) return;
    const nextBg: BackgroundMode =
      preset === 'none'
        ? backgroundModeRef.current === 'stadium'
          ? liveModeRef.current === 'scenography'
            ? 'scenography'
            : 'dark'
          : backgroundModeRef.current
        : 'stadium';

    setStadiumBgSettings((prev) => {
      const updated = { ...prev, preset };
      stadiumBgSettingsRef.current = updated;
      return updated;
    });
    if (nextBg !== backgroundModeRef.current) {
      backgroundModeRef.current = nextBg;
      setBackgroundMode(nextBg);
    }
    broadcastCurrentState();
  };

  const handleUploadStadiumImage = async (file: File) => {
    if (isLayoutLockedRef.current) return;
    try {
      const processedDataUrl = await processStadiumImageFile(file);
      await saveStadiumCustomImage(processedDataUrl);
      setCustomStadiumImageUrl(processedDataUrl);
      setStadiumBgSettings((prev) => {
        const updated: StadiumBackgroundSettings = {
          ...prev,
          preset: 'custom_image',
          customImageName: file.name,
          customMediaVersion: Date.now(),
        };
        stadiumBgSettingsRef.current = updated;
        return updated;
      });
      backgroundModeRef.current = 'stadium';
      setBackgroundMode('stadium');
      broadcastCurrentState();
    } catch (err) {
      console.error('Errore caricamento immagine stadio:', err);
    }
  };

  const handleUploadStadiumVideo = async (file: File) => {
    if (isLayoutLockedRef.current) return;
    try {
      await saveStadiumCustomVideo(file);
      if (stadiumVideoObjectUrlRef.current) {
        URL.revokeObjectURL(stadiumVideoObjectUrlRef.current);
      }
      const objUrl = URL.createObjectURL(file);
      stadiumVideoObjectUrlRef.current = objUrl;
      setCustomStadiumVideoUrl(objUrl);
      setStadiumBgSettings((prev) => {
        const updated: StadiumBackgroundSettings = {
          ...prev,
          preset: 'custom_video',
          customVideoName: file.name,
          customMediaVersion: Date.now(),
        };
        stadiumBgSettingsRef.current = updated;
        return updated;
      });
      backgroundModeRef.current = 'stadium';
      setBackgroundMode('stadium');
      broadcastCurrentState();
    } catch (err) {
      console.error('Errore caricamento video stadio:', err);
    }
  };

  const handleRemoveStadiumCustomImage = async () => {
    if (isLayoutLockedRef.current) return;
    await saveStadiumCustomImage(null);
    setCustomStadiumImageUrl(null);
    setStadiumBgSettings((prev) => {
      const updated: StadiumBackgroundSettings = {
        ...prev,
        preset: prev.preset === 'custom_image' ? 'stadio_reale' : prev.preset,
        customImageName: undefined,
        customMediaVersion: Date.now(),
      };
      stadiumBgSettingsRef.current = updated;
      return updated;
    });
    broadcastCurrentState();
  };

  const handleRemoveStadiumCustomVideo = async () => {
    if (isLayoutLockedRef.current) return;
    await saveStadiumCustomVideo(null);
    if (stadiumVideoObjectUrlRef.current) {
      URL.revokeObjectURL(stadiumVideoObjectUrlRef.current);
      stadiumVideoObjectUrlRef.current = null;
    }
    setCustomStadiumVideoUrl(null);
    setStadiumBgSettings((prev) => {
      const updated: StadiumBackgroundSettings = {
        ...prev,
        preset: prev.preset === 'custom_video' ? 'stadio_reale' : prev.preset,
        customVideoName: undefined,
        customMediaVersion: Date.now(),
      };
      stadiumBgSettingsRef.current = updated;
      return updated;
    });
    broadcastCurrentState();
  };

  const selectedDeviceName =
    availableDevices.find((d) => d.deviceId === selectedDeviceId)?.label ||
    (isSimulating ? 'Modalità Simulatore' : 'Nessuna Webcam');

  // MAIN STUDIO CONTROLLER & MODALITÀ LIVE (keeps webcam, MediaPipe & GIFs uninterrupted)
  return (
    <div
      ref={studioRootRef}
      tabIndex={-1}
      className={
        isCleanFullscreen
          ? 'relative w-screen h-screen overflow-hidden flex items-center justify-center select-none outline-none'
          : 'min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white outline-none'
      }
      style={
        isCleanFullscreen
          ? { backgroundColor: backgroundMode === 'green' ? '#00FF00' : '#000000' }
          : undefined
      }
    >
      {/* Hidden top-right hover hotspot to exit MODALITÀ LIVE with one click */}
      {isCleanFullscreen && (
        <div
          onMouseEnter={() => setIsLiveExitHovered(true)}
          onMouseLeave={() => setIsLiveExitHovered(false)}
          className="fixed top-0 right-0 z-[100] w-72 h-28 flex items-start justify-end p-4 pointer-events-auto"
        >
          <button
            type="button"
            onClick={exitLiveMode}
            title="Esci dalla Modalità Live (ESC o CTRL + SHIFT + L)"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950/90 hover:bg-red-600 text-white border border-red-500/70 shadow-2xl shadow-black/80 backdrop-blur-md text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              isLiveExitHovered
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-1 pointer-events-none'
            }`}
          >
            <Minimize2 className="w-4 h-4" />
            <span>ESCI DALLA MODALITÀ LIVE</span>
          </button>
        </div>
      )}

      {/* Hidden processing video element (always mounted so MediaPipe stays active in Modalità Live) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="fixed -top-96 -left-96 w-64 h-48 opacity-0 pointer-events-none"
      />

      {/* Top Navigation Bar: Rossonero Style */}
      {!isCleanFullscreen && (
        <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-black border border-red-500 shadow-lg shadow-red-600/30">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base lg:text-lg font-black tracking-tight text-white uppercase">
                  TWINHITS <span className="text-red-500">FACECAM</span>
                </h1>
                <span className="text-[10px] font-mono font-bold bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
                  TIKTOK LIVE READY
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Face Tracking VTuber & Scenografia Stadio 9:16 per Windows 11
              </p>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulating((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isSimulating
                  ? 'bg-amber-600/30 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Simula movimento e voce per test rapido senza telecamera"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Test Simulazione</span>
            </button>

            <button
              onClick={() => setIsTikTokGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-semibold transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline">Guida TikTok LIVE</span>
            </button>

            <button
              onClick={enterLiveMode}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition transform active:scale-95"
              title="Nascondi tutti i menu e pannelli per catturare direttamente questa finestra in TikTok LIVE Studio (ESC o CTRL + SHIFT + L per uscire)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>MODALITÀ LIVE</span>
            </button>

            <button
              onClick={handleOpenPopoutWindow}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 transition transform active:scale-95"
              title="Apri finestra pulita sincronizzata per TikTok LIVE Studio"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Finestra Pulita Output</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Studio Body: 2 Columns (or full-viewport pure stage in MODALITÀ LIVE) */}
      <main
        className={
          isCleanFullscreen
            ? 'w-screen h-screen flex items-center justify-center overflow-hidden'
            : 'flex-1 max-w-[1700px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start'
        }
      >
        {/* Left Column: Live Canvas & Real-time Telemetry HUD (7 cols) */}
        <div
          className={
            isCleanFullscreen
              ? 'w-full h-full flex items-center justify-center'
              : 'xl:col-span-7 flex flex-col gap-4'
          }
        >
          {!isCleanFullscreen && (
            <LiveHUD
              webcamDeviceName={selectedDeviceName}
              isTracking={isTracking || isSimulating}
              faceData={faceData}
              realFps={realFps}
              cameraError={cameraError}
              delegateMode={delegateMode}
              onRetryCamera={handleRetryCamera}
              onStartSimulation={handleStartSimulation}
              onOpenGuide={() => setIsTikTokGuideOpen(true)}
            />
          )}

          {/* Broadcast Stage Container */}
          <div
            className={
              isCleanFullscreen
                ? 'w-full h-full flex items-center justify-center overflow-hidden'
                : 'relative w-full rounded-2xl overflow-hidden bg-[#050507] border border-zinc-800 shadow-2xl flex flex-col items-center justify-center p-3 h-[520px] sm:h-[600px] lg:h-[680px]'
            }
          >
            {/* Top Stage Badges */}
            {!isCleanFullscreen && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
                <span className="bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> ANTEPRIMA STUDIO
                </span>
                <span className="bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-[11px] font-mono px-2 py-1 rounded-md">
                  {aspectRatio}
                </span>
                <span className="bg-zinc-900/90 border border-zinc-800 text-red-400 text-[11px] font-bold px-2 py-1 rounded-md">
                  {liveMode === 'solo'
                    ? 'SOLO AVATAR'
                    : liveMode === 'dual'
                    ? 'DOPPIO CONDUTTORE'
                    : backgroundMode === 'stadium' && stadiumBgSettings.preset !== 'none'
                    ? 'SOLO SFONDO STADIO'
                    : 'SOLO SCENOGRAFIA 9:16'}
                </span>
              </div>
            )}

            {!isCleanFullscreen && (
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={enterLiveMode}
                  title="Attiva Modalità Live a schermo intero (ESC o CTRL + SHIFT + L per tornare ai controlli)"
                  className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-700 text-xs flex items-center gap-1.5 backdrop-blur shadow transition"
                >
                  <Tv className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-semibold">Modalità Live</span>
                </button>
              </div>
            )}

            <AvatarCanvas
              character={activeCharacter}
              faceData={faceData}
              settings={settings}
              liveMode={liveMode}
              aspectRatio={aspectRatio}
              backgroundMode={backgroundMode}
              webcamVideoRef={videoRef}
              dualSettings={dualSettings}
              scenographySettings={scenographySettings}
              stadiumBgSettings={stadiumBgSettings}
              customStadiumImageUrl={customStadiumImageUrl}
              customStadiumVideoUrl={customStadiumVideoUrl}
              resolvedAvatarMediaUrls={resolveCharacterMediaUrls(activeCharacter, avatarMediaUrlMap)}
              isCleanOutput={isCleanFullscreen}
            />

            {!isCleanFullscreen && !isTracking && !isSimulating && (
              <div className="absolute bottom-4 z-20 bg-zinc-950/90 border border-zinc-800 backdrop-blur-md px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-zinc-300 font-medium">
                    Avatar pronto in posa SILENT
                  </span>
                </div>
                <button
                  onClick={handleToggleTracking}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow transition"
                >
                  Avvia Tracking
                </button>
              </div>
            )}
          </div>

          {!isCleanFullscreen && (
            <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl flex items-center justify-between text-[11px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>
                  <strong>Privacy Totale:</strong> Elaborazione locale WebAssembly, nessuna immagine inviata a server esterni.
                </span>
              </div>
              <span className="font-mono text-zinc-600 hidden sm:inline">Windows 11 / Chrome 64-bit</span>
            </div>
          )}
        </div>

        {/* Right Column: Controls, Sliders & Settings (5 cols) */}
        {!isCleanFullscreen && (
          <div className="xl:col-span-5">
          <ControlPanel
            isTracking={isTracking}
            onToggleTracking={handleToggleTracking}
            availableDevices={availableDevices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={handleSelectDevice}
            onRefreshDevices={refreshDevices}
            isLoadingMediaPipe={isLoadingMediaPipe}
            initProgress={initProgress}
            cameraError={cameraError}
            onRetryCamera={handleRetryCamera}
            onStartSimulation={handleStartSimulation}
            webcamStream={webcamStream}
            isFaceDetected={isTracking && faceData.detected}
            characters={characters}
            activeCharacterId={activeCharacterId}
            onSelectCharacter={handleSelectCharacter}
            onOpenCharacterModal={() => setIsCharacterModalOpen(true)}
            avatarMediaUrlMap={avatarMediaUrlMap}
            settings={settings}
            onUpdateSettings={(newVals) => {
              const filteredVals = { ...newVals };
              if (isLayoutLockedRef.current) {
                delete filteredVals.characterScale;
                delete filteredVals.characterPosX;
                delete filteredVals.characterPosY;
              }
              if (Object.keys(filteredVals).length === 0) return;
              setSettings((p) => {
                const updated = { ...p, ...filteredVals };
                settingsRef.current = updated;
                broadcastCurrentState();
                return updated;
              });
            }}
            onResetSettings={() => {
              setSettings((p) => {
                const updated = isLayoutLockedRef.current
                  ? {
                      ...DEFAULT_SETTINGS,
                      characterScale: p.characterScale,
                      characterPosX: p.characterPosX,
                      characterPosY: p.characterPosY,
                    }
                  : DEFAULT_SETTINGS;
                settingsRef.current = updated;
                broadcastCurrentState();
                return updated;
              });
            }}
            liveMode={liveMode}
            onSetLiveMode={(mode) => {
              if (isLayoutLockedRef.current) return;
              liveModeRef.current = mode;
              setLiveMode(mode);
              broadcastCurrentState();
            }}
            aspectRatio={aspectRatio}
            onSetAspectRatio={(ratio) => {
              if (isLayoutLockedRef.current) return;
              aspectRatioRef.current = ratio;
              setAspectRatio(ratio);
              broadcastCurrentState();
            }}
            backgroundMode={backgroundMode}
            onSetBackgroundMode={(bg) => {
              if (isLayoutLockedRef.current) return;
              backgroundModeRef.current = bg;
              setBackgroundMode(bg);
              broadcastCurrentState();
            }}
            scenographySettings={scenographySettings}
            onUpdateScenographySettings={(newVals) => {
              if (isLayoutLockedRef.current) return;
              setScenographySettings((p) => {
                const updated = { ...p, ...newVals };
                scenographySettingsRef.current = updated;
                broadcastCurrentState();
                return updated;
              });
            }}
            stadiumBgSettings={stadiumBgSettings}
            onSelectStadiumPreset={handleSelectStadiumPreset}
            onUpdateStadiumBgSettings={(newVals) => {
              if (isLayoutLockedRef.current) return;
              setStadiumBgSettings((p) => {
                const updated = { ...p, ...newVals };
                stadiumBgSettingsRef.current = updated;
                broadcastCurrentState();
                return updated;
              });
            }}
            onResetStadiumBgSettings={() => {
              if (isLayoutLockedRef.current) return;
              setStadiumBgSettings((p) => {
                const updated = {
                  ...DEFAULT_STADIUM_BG_SETTINGS,
                  preset: p.preset,
                  customMediaVersion: p.customMediaVersion,
                  customImageName: p.customImageName,
                  customVideoName: p.customVideoName,
                };
                stadiumBgSettingsRef.current = updated;
                broadcastCurrentState();
                return updated;
              });
            }}
            onUploadStadiumImage={handleUploadStadiumImage}
            onUploadStadiumVideo={handleUploadStadiumVideo}
            onRemoveStadiumCustomImage={handleRemoveStadiumCustomImage}
            onRemoveStadiumCustomVideo={handleRemoveStadiumCustomVideo}
            hasCustomStadiumImage={Boolean(customStadiumImageUrl)}
            hasCustomStadiumVideo={Boolean(customStadiumVideoUrl)}
            dualSettings={dualSettings}
            onUpdateDualSettings={(newVals) => {
              if (isLayoutLockedRef.current) return;
              setDualSettings((p) => {
                const updated = { ...p, ...newVals };
                dualSettingsRef.current = updated;
                broadcastCurrentState();
                return updated;
              });
            }}
            isLayoutLocked={isLayoutLocked}
            onToggleLayoutLock={() => setIsLayoutLocked((prev) => !prev)}
            onOpenPopoutWindow={handleOpenPopoutWindow}
            onToggleFullscreen={toggleLiveMode}
            onOpenTikTokGuide={() => setIsTikTokGuideOpen(true)}
          />
        </div>
        )}
      </main>

      {!isCleanFullscreen && (
        <>
          <CharacterModal
            isOpen={isCharacterModalOpen}
            onClose={() => setIsCharacterModalOpen(false)}
            characters={characters}
            activeCharacterId={activeCharacterId}
            onSelectCharacter={handleSelectCharacter}
            onSaveCharacter={handleSaveCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            avatarMediaUrlMap={avatarMediaUrlMap}
          />

          <TikTokStudioGuide
            isOpen={isTikTokGuideOpen}
            onClose={() => setIsTikTokGuideOpen(false)}
            onOpenPopout={handleOpenPopoutWindow}
          />
        </>
      )}
    </div>
  );
}
