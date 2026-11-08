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
} from './types/vtuber';
import { DEFAULT_CHARACTERS } from './utils/defaultCharacters';
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
} from './services/characterStorage';
import {
  Radio,
  Minimize2,
  Tv,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  VideoOff,
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
  theme: 'studio_led',
  motionIntensity: 1.0,
  brightness: 1.0,
  smokeIntensity: 0.6,
  speed: 1.0,
  isFrozen: false,
  showLedBoard: true,
  ledText: 'TWINHITS LIVE • TELECRONACA ROSSONERA • TIKTOK LIVE • FORZA MILAN',
};

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

  // Tracking & Webcam state
  const [isTracking, setIsTracking] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingMediaPipe, setIsLoadingMediaPipe] = useState(false);
  const [initProgress, setInitProgress] = useState('');
  const [realFps, setRealFps] = useState(0);
  const [delegateMode, setDelegateMode] = useState<'GPU' | 'CPU'>('CPU');

  // Simulation test mode (useful if camera is blocked or offline)
  const [isSimulating, setIsSimulating] = useState(false);

  // Modals & Clean views
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isTikTokGuideOpen, setIsTikTokGuideOpen] = useState(false);
  const [isCleanFullscreen, setIsCleanFullscreen] = useState(false);

  // Live face data
  const [faceData, setFaceData] = useState<FaceData>({
    detected: false,
    jawOpen: 0,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    mouthSmile: 0,
    mouthPucker: 0,
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
  const landmarkerRef = useRef<any>(null);

  // Active character object
  const activeCharacter =
    characters.find((c) => c.id === activeCharacterId) || characters[0] || DEFAULT_CHARACTERS[0];

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
      } catch (e) {
        console.warn('Inizializzazione storage non riuscita', e);
      }
    };
    initStorage();
  }, []);

  // Save scenography settings to localStorage
  useEffect(() => {
    localStorage.setItem('twinhits_scenography', JSON.stringify(scenographySettings));
  }, [scenographySettings]);

  // Broadcast function to synchronize output window immediately
  const broadcastCurrentState = useCallback(
    (customFace?: FaceData) => {
      if (!syncManagerRef.current) return;

      const currentFace = customFace || faceDataRef.current;
      const packet: SyncPacket = {
        type: 'TWINHITS_SYNC_STATE',
        timestamp: performance.now(),
        character: activeCharacter,
        faceData: currentFace,
        settings,
        dualSettings,
        liveMode,
        aspectRatio,
        backgroundMode,
        scenographySettings,
      };

      syncManagerRef.current.broadcastState(packet);
    },
    [activeCharacter, settings, dualSettings, liveMode, aspectRatio, backgroundMode, scenographySettings]
  );

  // Initialize StreamSyncManager
  useEffect(() => {
    const manager = new StreamSyncManager((msg) => {
      if (msg.type === 'TWINHITS_REQUEST_STATE') {
        broadcastCurrentState();
      }
    });

    syncManagerRef.current = manager;

    return () => {
      manager.destroy();
    };
  }, [broadcastCurrentState]);

  // Keep-alive heartbeat: broadcast state every 350ms so output window is never stale or disconnected
  useEffect(() => {
    broadcastCurrentState();
    const interval = setInterval(() => {
      broadcastCurrentState();
    }, 350);

    return () => clearInterval(interval);
  }, [broadcastCurrentState]);

  // Persist state updates to localStorage & IndexedDB
  useEffect(() => {
    localStorage.setItem('twinhits_characters', JSON.stringify(characters));
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

  // Start / Stop Webcam Stream with resilient fallback ladder for Windows 11 & Chrome
  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    try {
      // 1. Thoroughly stop existing tracks and detach video element
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

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Windows DirectShow/MediaFoundation exclusive lock release delay
      await new Promise((r) => setTimeout(r, 200));

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

        // Attempt 2: If exact deviceId threw NotReadableError or Device in use, try soft ideal constraint
        if (deviceId && !msg1.includes('NotAllowedError') && !msg1.includes('Permission')) {
          await new Promise((r) => setTimeout(r, 250));
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { ideal: deviceId },
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
              },
              audio: false,
            });
          } catch (err2) {
            lastErr = err2;
            console.warn('Tentativo fallback ideal fallito:', err2);
          }
        }

        // Attempt 3: Try general video constraint if still failing
        if (!stream && !msg1.includes('NotAllowedError') && !msg1.includes('Permission')) {
          await new Promise((r) => setTimeout(r, 200));
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (err3) {
            lastErr = err3;
          }
        }
      }

      if (!stream) {
        throw lastErr || new Error('Impossibile accedere alla webcam');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await refreshDevices();
      return true;
    } catch (err: unknown) {
      console.error('Errore avvio webcam:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
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
    }
  };

  const stopCamera = () => {
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Main Detection Loop using detectForVideo
  const runDetectionLoop = useCallback(async () => {
    if (!isTracking) return;

    try {
      setIsLoadingMediaPipe(true);
      setInitProgress('Caricamento MediaPipe Face Landmarker...');
      const landmarker = await getFaceLandmarker({
        preferGpu: false, // Default CPU friendly for low-end laptops
        onProgress: (p) => setInitProgress(p),
      });
      landmarkerRef.current = landmarker;
      setDelegateMode(getCurrentDelegate());
      setIsLoadingMediaPipe(false);

      const targetInterval = 1000 / settings.targetFps;

      const detectFrame = () => {
        if (!isTracking) return;

        const now = performance.now();
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
            } catch (frameErr) {
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
  }, [isTracking, settings.targetFps, broadcastCurrentState]);

  // Keep tracking alive even when the browser tab is blurred or backgrounded (Requirement 8)
  useEffect(() => {
    let backgroundInterval: number | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden && isTracking) {
        // Fallback interval when requestAnimationFrame is throttled by browser
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
            } catch (e) {
              // ignore
            }
          }
        }, 1000 / settings.targetFps);
      } else {
        if (backgroundInterval) {
          clearInterval(backgroundInterval);
          backgroundInterval = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (backgroundInterval) clearInterval(backgroundInterval);
    };
  }, [isTracking, settings.targetFps, broadcastCurrentState]);

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
  const handleSaveCharacter = async (char: Character) => {
    await saveCharacterToDB(char);
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === char.id);
      if (exists) {
        return prev.map((c) => (c.id === char.id ? char : c));
      }
      return [...prev, char];
    });
    // If saving the active character, immediately synchronize output
    if (char.id === activeCharacterId) {
      setTimeout(() => broadcastCurrentState(), 50);
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    await deleteCharacterFromDB(id);
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (activeCharacterId === id) {
      setActiveCharacterId(DEFAULT_CHARACTERS[0].id);
    }
  };

  const handleSelectCharacter = (id: string) => {
    setActiveCharacterId(id);
    const chosen = characters.find((c) => c.id === id);
    if (chosen && syncManagerRef.current) {
      syncManagerRef.current.broadcastState({
        type: 'TWINHITS_SYNC_STATE',
        timestamp: performance.now(),
        character: chosen,
        faceData: faceDataRef.current,
        settings,
        dualSettings,
        liveMode,
        aspectRatio,
        backgroundMode,
      });
    }
  };

  // Open Popout Clean Output Window with direct postMessage & BroadcastChannel link
  const handleOpenPopoutWindow = () => {
    const width = aspectRatio === '9:16' ? 540 : 960;
    const height = aspectRatio === '9:16' ? 960 : 540;
    const left = Math.round(window.screen.width / 2 - width / 2);
    const top = Math.round(window.screen.height / 2 - height / 2);

    const popout = window.open(
      `${window.location.origin}${window.location.pathname}?mode=output`,
      'TWINHITS_FACECAM_OUTPUT',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,status=no,resizable=yes`
    );

    if (popout && syncManagerRef.current) {
      syncManagerRef.current.setTargetWindow(popout);
      // Immediately push current character state and retry after window loads
      broadcastCurrentState();
      setTimeout(() => broadcastCurrentState(), 250);
      setTimeout(() => broadcastCurrentState(), 750);
      setTimeout(() => broadcastCurrentState(), 1500);
    } else if (!popout) {
      setIsCleanFullscreen(true);
    }
  };

  const selectedDeviceName =
    availableDevices.find((d) => d.deviceId === selectedDeviceId)?.label ||
    (isSimulating ? 'Modalità Simulatore' : 'Nessuna Webcam');

  // CLEAN FULLSCREEN IN-APP MODE
  if (isCleanFullscreen) {
    return (
      <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center select-none" style={{ backgroundColor: backgroundMode === 'green' ? '#00FF00' : '#000000' }}>
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
          isCleanOutput={true}
        />

        <button
          onClick={() => setIsCleanFullscreen(false)}
          title="Esci dalla modalità a schermo intero"
          className="absolute top-3 right-3 opacity-20 hover:opacity-100 bg-zinc-950/90 text-white p-2 rounded-xl border border-zinc-700 shadow-xl transition-all z-50"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // MAIN STUDIO CONTROLLER INTERFACE
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* Hidden processing video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="fixed -top-96 -left-96 w-64 h-48 opacity-0 pointer-events-none"
      />

      {/* Top Navigation Bar: Rossonero Style */}
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
            onClick={handleOpenPopoutWindow}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 transition transform active:scale-95"
            title="Apri finestra pulita sincronizzata per TikTok LIVE Studio"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Finestra Pulita Output</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body: 2 Columns */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Live Canvas & Real-time Telemetry HUD (7 cols) */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          
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

          {/* Broadcast Stage Container */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-[#050507] border border-zinc-800 shadow-2xl flex flex-col items-center justify-center p-3 h-[520px] sm:h-[600px] lg:h-[680px]">
            
            {/* Top Stage Badges */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
              <span className="bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> ANTEPRIMA STUDIO
              </span>
              <span className="bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-[11px] font-mono px-2 py-1 rounded-md">
                {aspectRatio}
              </span>
              <span className="bg-zinc-900/90 border border-zinc-800 text-red-400 text-[11px] font-bold px-2 py-1 rounded-md">
                {liveMode === 'solo' ? 'SOLO AVATAR' : liveMode === 'dual' ? 'DOPPIO CONDUTTORE' : 'SOLO SCENOGRAFIA 9:16'}
              </span>
            </div>

            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={() => setIsCleanFullscreen(true)}
                title="Attiva Schermo Intero per Window Capture"
                className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-700 text-xs flex items-center gap-1.5 backdrop-blur shadow transition"
              >
                <Tv className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] font-semibold">Cattura Window</span>
              </button>
            </div>

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
              isCleanOutput={false}
            />

            {!isTracking && !isSimulating && (
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

          <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl flex items-center justify-between text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>
                <strong>Privacy Totale:</strong> Elaborazione locale WebAssembly, nessuna immagine inviata a server esterni.
              </span>
            </div>
            <span className="font-mono text-zinc-600 hidden sm:inline">Windows 11 / Chrome 64-bit</span>
          </div>
        </div>

        {/* Right Column: Controls, Sliders & Settings (5 cols) */}
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
            characters={characters}
            activeCharacterId={activeCharacterId}
            onSelectCharacter={handleSelectCharacter}
            onOpenCharacterModal={() => setIsCharacterModalOpen(true)}
            settings={settings}
            onUpdateSettings={(newVals) => {
              setSettings((p) => {
                const updated = { ...p, ...newVals };
                setTimeout(() => broadcastCurrentState(), 20);
                return updated;
              });
            }}
            onResetSettings={() => {
              setSettings(DEFAULT_SETTINGS);
              setTimeout(() => broadcastCurrentState(), 20);
            }}
            liveMode={liveMode}
            onSetLiveMode={(mode) => {
              setLiveMode(mode);
              setTimeout(() => broadcastCurrentState(), 20);
            }}
            aspectRatio={aspectRatio}
            onSetAspectRatio={(ratio) => {
              setAspectRatio(ratio);
              setTimeout(() => broadcastCurrentState(), 20);
            }}
            backgroundMode={backgroundMode}
            onSetBackgroundMode={(bg) => {
              setBackgroundMode(bg);
              setTimeout(() => broadcastCurrentState(), 20);
            }}
            scenographySettings={scenographySettings}
            onUpdateScenographySettings={(newVals) => {
              setScenographySettings((p) => {
                const updated = { ...p, ...newVals };
                setTimeout(() => broadcastCurrentState(), 20);
                return updated;
              });
            }}
            dualSettings={dualSettings}
            onUpdateDualSettings={(newVals) => {
              setDualSettings((p) => {
                const updated = { ...p, ...newVals };
                setTimeout(() => broadcastCurrentState(), 20);
                return updated;
              });
            }}
            onOpenPopoutWindow={handleOpenPopoutWindow}
            onToggleFullscreen={() => setIsCleanFullscreen((v) => !v)}
            onOpenTikTokGuide={() => setIsTikTokGuideOpen(true)}
          />
        </div>
      </main>

      <CharacterModal
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        characters={characters}
        activeCharacterId={activeCharacterId}
        onSelectCharacter={handleSelectCharacter}
        onSaveCharacter={handleSaveCharacter}
        onDeleteCharacter={handleDeleteCharacter}
      />

      <TikTokStudioGuide
        isOpen={isTikTokGuideOpen}
        onClose={() => setIsTikTokGuideOpen(false)}
        onOpenPopout={handleOpenPopoutWindow}
      />
    </div>
  );
}
