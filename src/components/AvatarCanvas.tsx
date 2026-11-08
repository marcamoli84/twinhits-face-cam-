import React from 'react';
import {
  Character,
  FaceData,
  TrackingSettings,
  LiveMode,
  AspectRatioMode,
  BackgroundMode,
  DualHostSettings,
  ScenographySettings,
} from '../types/vtuber';
import { useCharacterAnimation } from '../hooks/useCharacterAnimation';
import { AnimatedScenography } from './AnimatedScenography';

interface AvatarCanvasProps {
  character: Character | null;
  faceData: FaceData;
  settings: TrackingSettings;
  liveMode: LiveMode;
  aspectRatio: AspectRatioMode;
  backgroundMode: BackgroundMode;
  customBgColor?: string;
  webcamVideoRef?: React.RefObject<HTMLVideoElement | null>;
  dualSettings: DualHostSettings;
  scenographySettings?: ScenographySettings;
  isCleanOutput?: boolean; // When true, no control guides, badges or UI outlines are shown
}

const DEFAULT_SCENOGRAPHY: ScenographySettings = {
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

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  character,
  faceData,
  settings,
  liveMode,
  aspectRatio,
  backgroundMode,
  customBgColor = '#0F0F12',
  webcamVideoRef,
  dualSettings,
  scenographySettings = DEFAULT_SCENOGRAPHY,
  isCleanOutput = false,
}) => {
  const { currentImageSrc, isSpeaking, transformStyle } = useCharacterAnimation(
    character,
    faceData,
    settings
  );

  const isGreenScreen = backgroundMode === 'green';
  const isScenographyBg = backgroundMode === 'scenography' || liveMode === 'scenography';

  // Background styling
  const getBgStyle = (): React.CSSProperties => {
    if (isScenographyBg) {
      return { backgroundColor: '#040507' };
    }
    switch (backgroundMode) {
      case 'green':
        return { backgroundColor: '#00FF00', background: '#00FF00' };
      case 'dark':
        return { backgroundColor: '#09090B' };
      case 'stadium':
        return {
          background: 'radial-gradient(ellipse at top, #1c2438 0%, #0d1117 60%, #05070a 100%)',
        };
      case 'custom':
        return { backgroundColor: customBgColor };
      default:
        return { backgroundColor: '#09090B' };
    }
  };

  // Aspect ratio container styles
  const getAspectClass = () => {
    const borderStyle = isGreenScreen || isCleanOutput
      ? 'border-0 rounded-none shadow-none'
      : 'border border-zinc-800 rounded-2xl shadow-2xl';

    if (isCleanOutput) {
      switch (aspectRatio) {
        case '9:16':
          return `h-screen max-h-screen aspect-[9/16] max-w-full ${borderStyle}`;
        case '16:9':
          return `w-screen max-w-screen aspect-[16/9] max-h-screen ${borderStyle}`;
        case 'fill':
        default:
          return `w-screen h-screen ${borderStyle}`;
      }
    }

    // In Studio preview inside dashboard
    switch (aspectRatio) {
      case '9:16':
        return `h-full max-h-[580px] aspect-[9/16] max-w-full ${borderStyle}`;
      case '16:9':
        return `w-full max-w-[900px] h-full max-h-[520px] aspect-[16/9] ${borderStyle}`;
      case 'fill':
      default:
        return `w-full h-full ${borderStyle}`;
    }
  };

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center select-none ${getAspectClass()} transition-colors duration-150`}
      style={getBgStyle()}
      id="twinhits-canvas-container"
    >
      {/* 1. SCENOGRAFIA ANIMATA 9:16 (Layer di sfondo procedurale stadio) */}
      {isScenographyBg && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <AnimatedScenography
            settings={scenographySettings}
            isStandalone={liveMode === 'scenography'}
          />
        </div>
      )}

      {/* Subtle stadium grid pattern (only on dark/stadium mode) */}
      {!isGreenScreen && !isCleanOutput && !isScenographyBg && (
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#E51A24_1px,transparent_1px)] [background-size:24px_24px] z-0" />
      )}

      {/* 2. MODALITÀ "SOLO SCENOGRAFIA": solo lo sfondo per TikTok LIVE Studio (nessun avatar/webcam) */}
      {liveMode === 'scenography' && (
        <div className="relative w-full h-full z-10 pointer-events-none flex flex-col items-center justify-between p-4">
          {!isCleanOutput && (
            <div className="bg-red-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-md shadow flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              MODALITÀ SOLO SCENOGRAFIA 9:16 ATTIVA (PER TIKTOK STUDIO)
            </div>
          )}
        </div>
      )}

      {/* 3. MODALITÀ "SOLO AVATAR": Cartoon Avatar in primo piano */}
      {liveMode === 'solo' && (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden z-10">
          {/* Subtle Ambient Keylight Glow behind character for separation (disabled on green screen) */}
          {!isGreenScreen && (
            <div
              className="absolute pointer-events-none rounded-full blur-3xl opacity-60 transition-all"
              style={{
                left: `${settings.characterPosX}%`,
                top: `${settings.characterPosY}%`,
                transform: 'translate(-50%, -50%)',
                width: '65%',
                height: '75%',
                background:
                  backgroundMode === 'scenography' && scenographySettings?.theme === 'energy_arena'
                    ? 'radial-gradient(circle, rgba(255,46,59,0.22) 0%, rgba(229,26,36,0.06) 60%, transparent 80%)'
                    : 'radial-gradient(circle, rgba(229,26,36,0.18) 0%, rgba(255,255,255,0.04) 50%, transparent 75%)',
              }}
            />
          )}

          {/* Soft Ground Contact Shadow beneath Avatar */}
          {!isGreenScreen && (
            <div
              className="absolute pointer-events-none rounded-full bg-black/65 blur-lg transition-all"
              style={{
                left: `${settings.characterPosX}%`,
                top: `${Math.min(95, settings.characterPosY + 32 * settings.characterScale)}%`,
                transform: 'translate(-50%, -50%)',
                width: `${Math.min(320, 260 * settings.characterScale)}px`,
                height: `${Math.min(36, 26 * settings.characterScale)}px`,
              }}
            />
          )}

          <div
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              left: `${settings.characterPosX}%`,
              top: `${settings.characterPosY}%`,
              transform: 'translate(-50%, -50%)',
              width: '85%',
              height: '85%',
            }}
          >
            <div
              style={transformStyle}
              className="relative flex items-center justify-center w-full h-full"
            >
              {currentImageSrc ? (
                <img
                  src={currentImageSrc}
                  alt={character?.name || 'Avatar Cartoon'}
                  className={`w-full h-full max-h-full max-w-full object-contain ${
                    isGreenScreen
                      ? 'shadow-none filter-none'
                      : 'filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.7)] drop-shadow-[0_2px_8px_rgba(229,26,36,0.2)]'
                  }`}
                  style={{ imageRendering: 'auto' }}
                  draggable={false}
                />
              ) : (
                !isCleanOutput && (
                  <div className="text-zinc-500 text-xs p-3 border border-zinc-800 rounded-lg bg-zinc-900/90 text-center">
                    Nessuna immagine per questo personaggio
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODALITÀ "DOPPIO CONDUTTORE": Webcam reale a sinistra, Avatar a destra */}
      {liveMode === 'dual' && (
        <div className="relative w-full h-full flex flex-row items-stretch justify-between p-3 gap-3 z-10">
          {/* Webcam Box */}
          <div
            className={`relative flex flex-col justify-center items-center overflow-hidden transition-all duration-200 ${
              isGreenScreen
                ? 'border-0 rounded-none shadow-none bg-black'
                : 'rounded-xl shadow-2xl border border-red-600/40 bg-black/70 backdrop-blur-xs'
            }`}
            style={{ width: `${dualSettings.webcamWidthPercent}%` }}
          >
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {webcamVideoRef?.current?.srcObject ? (
                <video
                  ref={(node) => {
                    if (node && webcamVideoRef.current?.srcObject && node.srcObject !== webcamVideoRef.current.srcObject) {
                      node.srcObject = webcamVideoRef.current.srcObject;
                      node.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-red-500/40 flex items-center justify-center mb-2 animate-pulse text-red-500 font-bold text-xs">
                    CAM
                  </div>
                  <span className="text-[11px]">Webcam in attesa...</span>
                </div>
              )}

              {/* Broadcast nameplate banner for webcam */}
              {(!isCleanOutput || !isGreenScreen) && (
                <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-r from-black/95 via-zinc-900/90 to-red-950/80 backdrop-blur-sm border-l-4 border-red-600 px-2.5 py-1 rounded shadow text-left flex items-center justify-between pointer-events-none">
                  <span className="text-xs font-bold uppercase tracking-wider text-white truncate max-w-[120px]">
                    {dualSettings.webcamLabel || 'Telecronista'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> LIVE
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Avatar Box */}
          <div
            className={`relative flex flex-col justify-center items-center overflow-hidden transition-all duration-200 ${
              isGreenScreen
                ? 'border-0 rounded-none shadow-none bg-transparent'
                : 'rounded-xl shadow-2xl border border-red-600/40 bg-black/50 backdrop-blur-xs'
            }`}
            style={{
              width: `${100 - dualSettings.webcamWidthPercent}%`,
              backgroundColor: isGreenScreen ? 'transparent' : isScenographyBg ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.5)',
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  left: `${settings.characterPosX}%`,
                  top: `${settings.characterPosY}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '90%',
                  height: '90%',
                }}
              >
                <div style={transformStyle} className="relative flex items-center justify-center w-full h-full">
                  {currentImageSrc && (
                    <img
                      src={currentImageSrc}
                      alt={character?.name || 'Avatar'}
                      className={`w-full h-full max-h-full max-w-full object-contain ${
                        isGreenScreen ? 'shadow-none filter-none' : 'filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]'
                      }`}
                      draggable={false}
                    />
                  )}
                </div>
              </div>

              {/* Broadcast nameplate banner for avatar */}
              {(!isCleanOutput || !isGreenScreen) && (
                <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-r from-red-950/95 via-zinc-900/90 to-black/95 backdrop-blur-sm border-r-4 border-red-600 px-2.5 py-1 rounded shadow text-right flex items-center justify-between pointer-events-none">
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-mono">
                    <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
                    {isSpeaking ? 'PARLA' : 'ON AIR'}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400 truncate max-w-[120px]">
                    {dualSettings.avatarLabel || character?.name || 'Avatar'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Speaking Indicator dot on top corner (only in non-clean preview) */}
      {!isCleanOutput && isSpeaking && !isGreenScreen && liveMode !== 'scenography' && (
        <div className="absolute top-3 right-3 bg-red-600/90 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse z-30">
          <span className="w-2 h-2 rounded-full bg-white" /> PARLA
        </div>
      )}
    </div>
  );
};
