import React, { useState, useEffect, useRef } from 'react';
import { StreamSyncManager, SyncPacket, AnySyncMessage } from '../services/streamSync';
import { AvatarCanvas } from './AvatarCanvas';
import { loadAllCharacters, loadAppConfig } from '../services/characterStorage';
import { Activity, WifiOff, ShieldCheck, RefreshCw, Radio } from 'lucide-react';

export const CleanOutputView: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncPacket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastReceivedTimestamp, setLastReceivedTimestamp] = useState<number>(0);
  const syncManagerRef = useRef<StreamSyncManager | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Initial attempt: check IndexedDB to pre-populate in case BroadcastChannel is negotiating
    const preload = async () => {
      try {
        const config = await loadAppConfig();
        const chars = await loadAllCharacters();
        if (config.activeCharacterId) {
          const char = chars.find((c) => c.id === config.activeCharacterId);
          if (char) {
            setSyncState((prev) => {
              if (prev?.character) return prev; // Do not overwrite active live state
              return {
                type: 'TWINHITS_SYNC_STATE',
                timestamp: performance.now(),
                character: char,
                faceData: {
                  detected: false,
                  jawOpen: 0,
                  eyeBlinkLeft: 0,
                  eyeBlinkRight: 0,
                  mouthSmile: 0,
                  mouthPucker: 0,
                  pitch: 0,
                  yaw: 0,
                  roll: 0,
                  timestamp: performance.now(),
                },
                settings: (config.settings as any) || {
                  mouthSensitivity: 0.16,
                  smoothing: 0.55,
                  headIntensity: 0.85,
                  mouthCloseDelay: 140,
                  targetFps: 30,
                  characterScale: 1.0,
                  characterPosX: 50,
                  characterPosY: 65,
                },
                dualSettings: (config.dualSettings as any) || {
                  webcamWidthPercent: 42,
                  webcamPosition: 'left',
                  webcamRounded: false,
                  webcamBorderColor: '#00FF00',
                  webcamLabel: 'TELECRONISTA',
                  avatarLabel: 'AVATAR',
                },
                liveMode: (config.liveMode as any) || 'solo',
                aspectRatio: (config.aspectRatio as any) || '9:16',
                backgroundMode: (config.backgroundMode as any) || 'green',
              };
            });
          }
        }
      } catch (e) {
        console.warn('Preload IndexedDB error', e);
      }
    };

    preload();

    // 2. Setup multi-channel synchronization manager
    const manager = new StreamSyncManager((msg: AnySyncMessage) => {
      if (msg.type === 'TWINHITS_SYNC_STATE') {
        const packet = msg as SyncPacket;
        setSyncState(packet);
        setIsConnected(true);
        setLastReceivedTimestamp(Date.now());
      }
    });

    syncManagerRef.current = manager;

    // Immediately request current active state from the main studio window
    manager.requestState();

    // Heartbeat check: request state periodically if disconnected
    checkIntervalRef.current = window.setInterval(() => {
      if (Date.now() - lastReceivedTimestamp > 4000) {
        setIsConnected(false);
        manager.requestState();
      }
    }, 1500);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      manager.destroy();
    };
  }, [lastReceivedTimestamp]);

  // When disconnected or no character data received, show clear diagnostic screen (Requirement 5)
  if (!isConnected || !syncState || !syncState.character) {
    return (
      <div className="w-screen h-screen bg-[#07080A] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-red-600/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
          
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-black border border-red-500 shadow-lg shadow-red-600/30 mb-4">
            <Radio className="w-7 h-7 text-white animate-pulse" />
          </div>

          <h1 className="text-base font-black tracking-tight uppercase text-white mb-1">
            TWINHITS FACECAM <span className="text-red-500">- OUTPUT STUDIO</span>
          </h1>
          <p className="text-xs text-zinc-400 mb-5">
            Finestra di cattura pulita per TikTok LIVE Studio / OBS
          </p>

          <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-2.5 text-left text-xs mb-5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-zinc-400">Stato Connessione:</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-amber-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                IN ATTESA SINCRONIZZAZIONE
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Canale Sincronizzazione:</span>
              <span className="font-mono text-zinc-300">twinhits_sync_stream</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Controllo Origine:</span>
              <span className="font-mono text-emerald-400 text-[11px] truncate max-w-[200px]">
                {typeof window !== 'undefined' ? window.location.origin : 'Locale'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Finestra Master (Opener):</span>
              <span className="font-mono text-zinc-300">
                {typeof window !== 'undefined' && window.opener ? 'Rilevata ✓' : 'Stand-alone'}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            Tieni aperta la <strong>finestra principale di TwinHits FaceCam</strong> per inviare il personaggio e il face tracking a questo output.
          </p>

          <button
            onClick={() => syncManagerRef.current?.requestState()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 transition transform active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Ritenta Connessione Ora
          </button>
        </div>
      </div>
    );
  }

  // Pure, clean synchronized output for Window Capture (No menus, No buttons, 100% Chroma key ready)
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
        isCleanOutput={true}
      />
    </div>
  );
};
