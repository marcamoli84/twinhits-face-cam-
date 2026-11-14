import React, { useEffect, useRef, useState } from 'react';
import { Character, CharacterSlotKey } from '../types/vtuber';
import { CHARACTER_SLOTS, inferMediaType } from '../utils/avatarMedia';

interface AvatarMediaStackProps {
  character: Character | null;
  activeSlot: CharacterSlotKey;
  resolvedMediaUrls?: Partial<Record<CharacterSlotKey, string>>;
  mediaClassName?: string;
  isPlaying?: boolean;
  onVideoRuntimeError?: (slot: CharacterSlotKey, message: string) => void;
}

interface SlotVideoLayerProps {
  src: string;
  isActive: boolean;
  isPlaying: boolean;
  className: string;
  onError: () => void;
}

const SlotVideoLayer: React.FC<SlotVideoLayerProps> = ({
  src,
  isActive,
  isPlaying,
  className,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.loop = true;

    if (isPlaying) {
      el.play().catch(() => {
        // Autoplay policy safe catch (always muted+playsInline so Chrome allows playback)
      });
    } else {
      el.pause();
    }
  }, [src, isPlaying]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay={isPlaying}
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
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
  onVideoRuntimeError,
}) => {
  const [erroredSlots, setErroredSlots] = useState<Partial<Record<CharacterSlotKey, boolean>>>({});

  // Reset errored state whenever character or resolved URLs change
  const charSignature = `${character?.id || ''}:${JSON.stringify(character?.mediaKeys || {})}:${JSON.stringify(resolvedMediaUrls || {})}`;
  useEffect(() => {
    setErroredSlots({});
  }, [charSignature]);

  if (!character) return null;

  const slotEntries = CHARACTER_SLOTS.map((slot) => {
    const src = resolvedMediaUrls?.[slot] || character.images?.[slot] || '';
    const mediaType = inferMediaType(character, slot, src);
    return { slot, src, mediaType };
  }).filter((entry) => Boolean(entry.src) && !erroredSlots[entry.slot]);

  if (slotEntries.length === 0) return null;

  // Pick effective visible slot with guaranteed fallback to speaking/silent/first available
  const hasActive = slotEntries.some((e) => e.slot === activeSlot);
  const effectiveSlot: CharacterSlotKey = hasActive
    ? activeSlot
    : slotEntries.find((e) => e.slot === 'speaking')?.slot ||
      slotEntries.find((e) => e.slot === 'silent')?.slot ||
      slotEntries[0].slot;

  const sharedLayerClass = `absolute inset-0 w-full h-full max-h-full max-w-full object-contain pointer-events-none select-none ${mediaClassName}`;

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      {slotEntries.map(({ slot, src, mediaType }) => {
        const isActive = slot === effectiveSlot;
        if (mediaType === 'video') {
          return (
            <SlotVideoLayer
              key={`${slot}-${src}`}
              src={src}
              isActive={isActive}
              isPlaying={isPlaying}
              className={sharedLayerClass}
              onError={() => {
                setErroredSlots((prev) => ({ ...prev, [slot]: true }));
                onVideoRuntimeError?.(
                  slot,
                  `Errore di riproduzione video nello stato "${slot}". Formato o codec non supportato dal browser.`
                );
              }}
            />
          );
        }

        return (
          <img
            key={`${slot}-${src.slice(0, 64)}`}
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
