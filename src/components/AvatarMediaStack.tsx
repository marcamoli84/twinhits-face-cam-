import React, { useEffect, useRef, useState } from 'react';
import { Character, CharacterSlotKey } from '../types/vtuber';
import { CHARACTER_SLOTS, inferMediaType } from '../utils/avatarMedia';

interface AvatarMediaStackProps {
  character: Character | null;
  activeSlot: CharacterSlotKey;
  resolvedMediaUrls?: Partial<Record<CharacterSlotKey, string>>;
  mediaClassName?: string;
  isPlaying?: boolean;
  goalVoiceEnabled?: boolean;
  goalTriggerId?: number;
  onGoalPlaybackEnded?: (triggerId: number) => void;
  onVideoRuntimeError?: (slot: CharacterSlotKey, message: string) => void;
}

interface SlotVideoLayerProps {
  src: string;
  isActive: boolean;
  isPlaying: boolean;
  loopPlayback: boolean;
  restartNonce: number;
  className: string;
  onEnded?: () => void;
  onError: () => void;
}

const SlotVideoLayer: React.FC<SlotVideoLayerProps> = ({
  src,
  isActive,
  isPlaying,
  loopPlayback,
  restartNonce,
  className,
  onEnded,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wasActiveRef = useRef<boolean>(false);
  const lastRestartNonceRef = useRef<number>(restartNonce);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.loop = loopPlayback;

    if (loopPlayback) {
      wasActiveRef.current = isActive;
      lastRestartNonceRef.current = restartNonce;
      if (isPlaying) {
        el.play().catch(() => {
          // Autoplay policy safe catch (always muted+playsInline so Chrome allows playback)
        });
      } else {
        el.pause();
      }
      return;
    }

    // One-shot GOAL playback mode:
    // Keep cued at t=0 when inactive; start from t=0 on activation or new triggerId.
    const becameActive = isActive && !wasActiveRef.current;
    const retriggered = isActive && restartNonce !== lastRestartNonceRef.current;
    wasActiveRef.current = isActive;
    lastRestartNonceRef.current = restartNonce;

    if (!isActive || !isPlaying) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        // ignore seek errors before metadata loads
      }
      return;
    }

    if (becameActive || retriggered) {
      try {
        el.currentTime = 0;
      } catch {
        // ignore seek errors before metadata loads
      }
      el.play().catch(() => {
        // If playback is blocked or fails to start, release GOAL state safely
        onEnded?.();
      });
    } else if (el.paused && !el.ended) {
      el.play().catch(() => {});
    }
  }, [src, isActive, isPlaying, loopPlayback, restartNonce, onEnded]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay={loopPlayback ? isPlaying : false}
      loop={loopPlayback}
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      onEnded={() => {
        if (!loopPlayback && isActive) {
          const el = videoRef.current;
          if (el) {
            el.pause();
            try {
              el.currentTime = 0;
            } catch {
              // ignore
            }
          }
          onEnded?.();
        }
      }}
      onError={onError}
      className={className}
      style={{
        opacity: isActive ? 1 : 0,
        zIndex: isActive ? 2 : 1,
        willChange: 'opacity',
      }}
    />
  );
};

/**
 * Renders all configured expression slots of the character inside the exact same
 * bounding box and switches visibility via opacity only, eliminating decode flicker,
 * black frames, and alignment jumps across PNG, GIF, and transparent WebM transitions.
 */
export const AvatarMediaStack: React.FC<AvatarMediaStackProps> = ({
  character,
  activeSlot,
  resolvedMediaUrls,
  mediaClassName = '',
  isPlaying = true,
  goalVoiceEnabled = false,
  goalTriggerId = 0,
  onGoalPlaybackEnded,
  onVideoRuntimeError,
}) => {
  const [erroredSlots, setErroredSlots] = useState<Partial<Record<CharacterSlotKey, boolean>>>({});

  // Reset errored state whenever character or resolved URLs change
  const charSignature = `${character?.id || ''}:${JSON.stringify(character?.mediaKeys || {})}:${JSON.stringify(resolvedMediaUrls || {})}`;
  useEffect(() => {
    setErroredSlots({});
  }, [charSignature]);

  const slotEntries = character
    ? CHARACTER_SLOTS.map((slot) => {
        const src = resolvedMediaUrls?.[slot] || character.images?.[slot] || '';
        const mediaType = inferMediaType(character, slot, src);
        return { slot, src, mediaType };
      }).filter((entry) => Boolean(entry.src) && !erroredSlots[entry.slot])
    : [];

  const hasActive = slotEntries.some((e) => e.slot === activeSlot);
  const effectiveSlot: CharacterSlotKey =
    slotEntries.length > 0
      ? hasActive
        ? activeSlot
        : slotEntries.find((e) => e.slot === 'speaking')?.slot ||
          slotEntries.find((e) => e.slot === 'silent')?.slot ||
          slotEntries[0].slot
      : 'silent';

  const activeEntry = slotEntries.find((e) => e.slot === effectiveSlot);
  const isOneShotGoalNonVideo =
    Boolean(goalVoiceEnabled) &&
    effectiveSlot === 'mouthA' &&
    goalTriggerId > 0 &&
    Boolean(activeEntry) &&
    activeEntry?.mediaType !== 'video';

  // If mouthA holds a GIF/PNG instead of a video, auto-return to SILENT/SPEAKING after one celebration burst
  useEffect(() => {
    if (!isOneShotGoalNonVideo || !onGoalPlaybackEnded) return;
    const timer = window.setTimeout(() => {
      onGoalPlaybackEnded(goalTriggerId);
    }, 2400);
    return () => clearTimeout(timer);
  }, [isOneShotGoalNonVideo, goalTriggerId, onGoalPlaybackEnded]);

  if (!character || slotEntries.length === 0) return null;

  const sharedLayerClass = `absolute inset-0 w-full h-full max-h-full max-w-full object-contain pointer-events-none select-none ${mediaClassName}`;

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      {slotEntries.map(({ slot, src, mediaType }) => {
        const isActive = slot === effectiveSlot;
        const isGoalMouthSlot = Boolean(goalVoiceEnabled) && slot === 'mouthA';

        if (mediaType === 'video') {
          return (
            <SlotVideoLayer
              key={`${slot}-${src}`}
              src={src}
              isActive={isActive}
              isPlaying={isPlaying}
              loopPlayback={!isGoalMouthSlot}
              restartNonce={isGoalMouthSlot ? goalTriggerId : 0}
              className={sharedLayerClass}
              onEnded={
                isGoalMouthSlot && onGoalPlaybackEnded
                  ? () => onGoalPlaybackEnded(goalTriggerId)
                  : undefined
              }
              onError={() => {
                setErroredSlots((prev) => ({ ...prev, [slot]: true }));
                if (isGoalMouthSlot && isActive) {
                  onGoalPlaybackEnded?.(goalTriggerId);
                }
                onVideoRuntimeError?.(
                  slot,
                  `Errore di riproduzione video nello stato "${slot}". Formato o codec non supportato dal browser.`
                );
              }}
            />
          );
        }

        const imgKey =
          isGoalMouthSlot && mediaType === 'gif' && isActive && goalTriggerId > 0
            ? `${slot}-goal-${goalTriggerId}-${src.slice(0, 48)}`
            : `${slot}-${src.slice(0, 64)}`;

        return (
          <img
            key={imgKey}
            src={src}
            alt={character.name || 'Avatar Cartoon'}
            className={sharedLayerClass}
            style={{
              imageRendering: 'auto',
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 2 : 1,
              willChange: 'opacity',
            }}
            draggable={false}
          />
        );
      })}
    </div>
  );
};
