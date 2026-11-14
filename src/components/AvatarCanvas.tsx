import React, { useLayoutEffect, useRef, useState } from 'react';
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
  CharacterSlotKey,
} from '../types/vtuber';
import { useCharacterAnimation } from '../hooks/useCharacterAnimation';
import { AnimatedScenography } from './AnimatedScenography';
import { AvatarMediaStack } from './AvatarMediaStack';
import { STADIUM_ASSETS } from '../utils/stadiumAssets';
import { hasCharacterSlot } from '../utils/avatarMedia';

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
  stadiumBgSettings?: StadiumBackgroundSettings;
  customStadiumImageUrl?: string | null;
  customStadiumVideoUrl?: string | null;
  resolvedAvatarMediaUrls?: Partial<Record<CharacterSlotKey, string>>;
  isCleanOutput?: boolean; // When true, zero badges, guides, or UI outlines are shown
}

const DEFAULT_SCENOGRAPHY: ScenographySettings = {
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

const DEFAULT_STADIUM_BG: StadiumBackgroundSettings = {
  preset: 'none',
  opacity: 1.0,
  blur: 0,
  brightness: 0.9,
  overlayDarkness: 0.32,
  customMediaVersion: 0,
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
  stadiumBgSettings = DEFAULT_STADIUM_BG,
  customStadiumImageUrl = null,
  customStadiumVideoUrl = null,
  resolvedAvatarMediaUrls,
  isCleanOutput = false,
}) => {
  const { activeSlot, isSpeaking, transformStyle } = useCharacterAnimation(
    character,
    faceData,
    settings
  );

  // Fixed logical stage dimensions: 720x1280 (9:16 vertical) or 1280x720 (16:9 horizontal)
  const logicalWidth = aspectRatio === '16:9' ? 1280 : 720;
  const logicalHeight = aspectRatio === '16:9' ? 720 : 1280;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>(() => {
    if (isCleanOutput && typeof window !== 'undefined') {
      return { w: window.innerWidth, h: window.innerHeight };
    }
    return { w: logicalWidth, h: logicalHeight };
  });

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize((prev) =>
          Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
            ? prev
            : { w: rect.width, h: rect.height }
        );
      } else if (isCleanOutput && typeof window !== 'undefined') {
        setContainerSize({ w: window.innerWidth, h: window.innerHeight });
      }
    };

    measure();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener('resize', measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isCleanOutput, logicalWidth, logicalHeight]);

  const uniformScale =
    containerSize.w > 0 && containerSize.h > 0
      ? Math.min(containerSize.w / logicalWidth, containerSize.h / logicalHeight)
      : 1;

  const hasAnyAvatarMedia =
    hasCharacterSlot(character, 'silent') ||
    hasCharacterSlot(character, 'speaking') ||
    hasCharacterSlot(character, 'eyesClosed') ||
    hasCharacterSlot(character, 'mouthA') ||
    hasCharacterSlot(character, 'mouthE') ||
    hasCharacterSlot(character, 'mouthO');

  const isGreenScreen = backgroundMode === 'green';
  const hasStadiumPreset = Boolean(stadiumBgSettings && stadiumBgSettings.preset !== 'none');
  const isRealisticStadiumBg =
    !isGreenScreen && backgroundMode === 'stadium' && hasStadiumPreset;
  const isScenographyBg =
    !isGreenScreen &&
    !isRealisticStadiumBg &&
    (backgroundMode === 'scenography' || liveMode === 'scenography');

  // Background styling
  const getBgStyle = (): React.CSSProperties => {
    if (isScenographyBg || isRealisticStadiumBg) {
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

  // Compute realistic stadium media source & filters
  const effectiveStadiumBlur =
    stadiumBgSettings.preset === 'stadio_reale_sfumato'
      ? Math.min(30, 6 + stadiumBgSettings.blur)
      : stadiumBgSettings.blur;
  const blurEdgeScale = effectiveStadiumBlur > 0 ? 1 + effectiveStadiumBlur * 0.008 : 1;

  const getStadiumImageSource = (): string => {
    switch (stadiumBgSettings.preset) {
      case 'studio_rossonero':
        return STADIUM_ASSETS.studioRossonero;
      case 'custom_image':
        return customStadiumImageUrl || STADIUM_ASSETS.stadiumReal;
      case 'stadio_reale':
      case 'stadio_reale_sfumato':
      default:
        return STADIUM_ASSETS.stadiumReal;
    }
  };

  const isCustomVideoActive =
    isRealisticStadiumBg &&
    stadiumBgSettings.preset === 'custom_video' &&
    Boolean(customStadiumVideoUrl);

  const stageBorderClass =
    isGreenScreen || isCleanOutput
      ? 'border-0 rounded-none shadow-none'
      : 'border border-zinc-800 rounded-xl shadow-2xl';

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full flex items-center justify-center overflow-hidden select-none"
      style={
        isCleanOutput
          ? { backgroundColor: isGreenScreen ? '#00FF00' : '#000000' }
          : undefined
      }
    >
      <div
        id="twinhits-canvas-container"
        className={`relative overflow-hidden flex items-center justify-center select-none shrink-0 ${stageBorderClass}`}
        style={{
          ...getBgStyle(),
          width: `${logicalWidth}px`,
          height: `${logicalHeight}px`,
          transform: `scale(${uniformScale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* 0. SFONDO STADIO REALISTICO (Immagine o Video + Controlli Leggibilità) */}
        {isRealisticStadiumBg && (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#040507]">
            {isCustomVideoActive && customStadiumVideoUrl ? (
              <video
                key={customStadiumVideoUrl}
                src={customStadiumVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                disablePictureInPicture
                className="w-full h-full object-cover"
                style={{
                  opacity: stadiumBgSettings.opacity,
                  filter: `blur(${effectiveStadiumBlur}px) brightness(${stadiumBgSettings.brightness})`,
                  transform: `scale(${blurEdgeScale})`,
                  willChange: 'transform, filter, opacity',
                }}
              />
            ) : (
              <img
                src={getStadiumImageSource()}
                alt="Sfondo Stadio"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                style={{
                  opacity: stadiumBgSettings.opacity,
                  filter: `blur(${effectiveStadiumBlur}px) brightness(${stadiumBgSettings.brightness})`,
                  transform: `scale(${blurEdgeScale})`,
                  willChange: 'transform, filter, opacity',
                }}
                draggable={false}
              />
            )}

            {/* Scurimento Overlay & Vignetta per massima leggibilità del personaggio */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  stadiumBgSettings.preset === 'stadio_reale_sfumato'
                    ? `radial-gradient(circle at 50% 45%, rgba(5,6,9,${Math.min(0.92, stadiumBgSettings.overlayDarkness * 0.85)}) 0%, rgba(4,5,7,${Math.min(0.96, stadiumBgSettings.overlayDarkness * 1.25 + 0.15)}) 100%)`
                    : `radial-gradient(circle at 50% 45%, rgba(5,6,9,${stadiumBgSettings.overlayDarkness * 0.78}) 0%, rgba(4,5,7,${Math.min(0.95, stadiumBgSettings.overlayDarkness * 1.15)}) 100%)`,
              }}
            />
          </div>
        )}

        {/* 1. SCENOGRAFIA ANIMATA 9:16 (Layer di sfondo procedurale stadio) */}
        {isScenographyBg && (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <AnimatedScenography
              settings={scenographySettings}
              isStandalone={!isCleanOutput && liveMode === 'scenography'}
            />
          </div>
        )}

        {/* Subtle stadium grid pattern (only on studio preview dark mode) */}
        {!isGreenScreen && !isCleanOutput && !isScenographyBg && !isRealisticStadiumBg && (
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#E51A24_1px,transparent_1px)] [background-size:24px_24px] z-0" />
        )}

        {/* 2. MODALITÀ "SOLO SCENOGRAFIA / SOLO SFONDO": solo lo sfondo per TikTok LIVE Studio */}
        {liveMode === 'scenography' && (
          <div className="relative w-full h-full z-10 pointer-events-none flex flex-col items-center justify-between p-6">
            {!isCleanOutput && (
              <div className="bg-red-600/90 text-white text-sm font-bold px-4 py-1.5 rounded-lg shadow flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                {isRealisticStadiumBg
                  ? 'MODALITÀ SOLO SFONDO STADIO ATTIVA (PER TIKTOK STUDIO)'
                  : 'MODALITÀ SOLO SCENOGRAFIA 9:16 ATTIVA (PER TIKTOK STUDIO)'}
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
                className="absolute pointer-events-none rounded-full blur-3xl opacity-60"
                style={{
                  left: `${settings.characterPosX}%`,
                  top: `${settings.characterPosY}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '65%',
                  height: '75%',
                  background:
                    isRealisticStadiumBg
                      ? 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(229,26,36,0.12) 45%, transparent 78%)'
                      : backgroundMode === 'scenography' && scenographySettings?.theme === 'energy_arena'
                      ? 'radial-gradient(circle, rgba(255,46,59,0.22) 0%, rgba(229,26,36,0.06) 60%, transparent 80%)'
                      : 'radial-gradient(circle, rgba(229,26,36,0.18) 0%, rgba(255,255,255,0.04) 50%, transparent 75%)',
                }}
              />
            )}

            {/* Soft Ground Contact Shadow beneath Avatar (logical coordinates fixed) */}
            {!isGreenScreen && (
              <div
                className="absolute pointer-events-none rounded-full bg-black/65 blur-xl"
                style={{
                  left: `${settings.characterPosX}%`,
                  top: `${Math.min(95, settings.characterPosY + 32 * settings.characterScale)}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${Math.min(540, 380 * settings.characterScale)}px`,
                  height: `${Math.min(54, 38 * settings.characterScale)}px`,
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
                {hasAnyAvatarMedia ? (
                  <AvatarMediaStack
                    character={character}
                    activeSlot={activeSlot}
                    resolvedMediaUrls={resolvedAvatarMediaUrls}
                    mediaClassName={
                      isGreenScreen
                        ? 'shadow-none filter-none'
                        : isRealisticStadiumBg
                        ? 'filter drop-shadow-[0_18px_32px_rgba(0,0,0,0.9)] drop-shadow-[0_0_10px_rgba(0,0,0,0.65)]'
                        : 'filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.7)] drop-shadow-[0_2px_8px_rgba(229,26,36,0.2)]'
                    }
                  />
                ) : (
                  !isCleanOutput && (
                    <div className="text-zinc-500 text-sm p-4 border border-zinc-800 rounded-lg bg-zinc-900/90 text-center">
                      Nessuna immagine o video per questo personaggio
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. MODALITÀ "DOPPIO CONDUTTORE": Webcam reale a sinistra, Avatar a destra */}
        {liveMode === 'dual' && (
          <div className="relative w-full h-full flex flex-row items-stretch justify-between p-4 gap-4 z-10">
            {/* Webcam Box */}
            <div
              className={`relative flex flex-col justify-center items-center overflow-hidden ${
                isGreenScreen || isCleanOutput
                  ? 'border-0 rounded-none shadow-none bg-black'
                  : 'rounded-2xl shadow-2xl border border-red-600/40 bg-black/70 backdrop-blur-xs'
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
                  <div className="flex flex-col items-center justify-center text-zinc-600 p-4 text-center">
                    {!isCleanOutput && (
                      <>
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500/40 flex items-center justify-center mb-2 animate-pulse text-red-500 font-bold text-xs">
                          CAM
                        </div>
                        <span className="text-xs text-zinc-400">Webcam in attesa...</span>
                      </>
                    )}
                  </div>
                )}

                {/* Broadcast nameplate banner for webcam */}
                {!isGreenScreen && (
                  <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-r from-black/95 via-zinc-900/90 to-red-950/80 backdrop-blur-sm border-l-4 border-red-600 px-3 py-1.5 rounded shadow text-left flex items-center justify-between pointer-events-none">
                    <span className="text-sm font-bold uppercase tracking-wider text-white truncate max-w-[160px]">
                      {dualSettings.webcamLabel || 'Telecronista'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Avatar Box */}
            <div
              className={`relative flex flex-col justify-center items-center overflow-hidden ${
                isGreenScreen || isCleanOutput
                  ? 'border-0 rounded-none shadow-none bg-transparent'
                  : isRealisticStadiumBg
                  ? 'rounded-2xl shadow-2xl border border-red-600/40 bg-black/20'
                  : 'rounded-2xl shadow-2xl border border-red-600/40 bg-black/50 backdrop-blur-xs'
              }`}
              style={{
                width: `${100 - dualSettings.webcamWidthPercent}%`,
                backgroundColor: isGreenScreen
                  ? 'transparent'
                  : isRealisticStadiumBg
                  ? 'rgba(0,0,0,0.22)'
                  : isScenographyBg
                  ? 'rgba(0,0,0,0.35)'
                  : 'rgba(0,0,0,0.5)',
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
                    {hasAnyAvatarMedia && (
                      <AvatarMediaStack
                        character={character}
                        activeSlot={activeSlot}
                        resolvedMediaUrls={resolvedAvatarMediaUrls}
                        mediaClassName={
                          isGreenScreen
                            ? 'shadow-none filter-none'
                            : isRealisticStadiumBg
                            ? 'filter drop-shadow-[0_14px_28px_rgba(0,0,0,0.9)] drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]'
                            : 'filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]'
                        }
                      />
                    )}
                  </div>
                </div>

                {/* Broadcast nameplate banner for avatar */}
                {!isGreenScreen && (
                  <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-r from-red-950/95 via-zinc-900/90 to-black/95 backdrop-blur-sm border-r-4 border-red-600 px-3 py-1.5 rounded shadow text-right flex items-center justify-between pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-400 font-mono">
                      <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`} />
                      {isSpeaking ? 'PARLA' : 'ON AIR'}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wider text-red-400 truncate max-w-[160px]">
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
          <div className="absolute top-4 right-4 bg-red-600/90 text-white font-mono text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse z-30">
            <span className="w-2.5 h-2.5 rounded-full bg-white" /> PARLA
          </div>
        )}
      </div>
    </div>
  );
};
