import { useRef, useMemo } from 'react';
import {
  Character,
  CharacterSlotKey,
  FaceData,
  TrackingSettings,
} from '../types/vtuber';
import { hasCharacterSlot } from '../utils/avatarMedia';

interface AnimationResult {
  activeSlot: CharacterSlotKey;
  currentImageSrc: string;
  isSpeaking: boolean;
  isBlinking: boolean;
  mouthPercent: number;
  transformStyle: React.CSSProperties;
  smoothedAngles: { roll: number; pitch: number; yaw: number };
}

export function useCharacterAnimation(
  character: Character | null,
  faceData: FaceData,
  settings: TrackingSettings
): AnimationResult {
  // Store smoothed state across frames
  const smoothedState = useRef({
    roll: 0,
    pitch: 0,
    yaw: 0,
    jawOpen: 0,
    lastSpeakingTime: 0,
    isSpeaking: false,
  });

  const now = performance.now();

  // 1. Calculate MediaPipe mouth opening & speaking state with hold delay
  const rawJaw = faceData.detected ? faceData.jawOpen : 0;

  // Smoothing factor: higher = smoother, lower = snappier
  const alpha = 1 - Math.min(0.95, Math.max(0.05, settings.smoothing));

  // Exponential moving average for jaw
  smoothedState.current.jawOpen += (rawJaw - smoothedState.current.jawOpen) * alpha;
  const currentJaw = smoothedState.current.jawOpen;

  // MediaPipe sensitivity threshold check
  const isFaceCurrentlyOpen = currentJaw >= settings.mouthSensitivity;
  if (isFaceCurrentlyOpen) {
    smoothedState.current.lastSpeakingTime = now;
    smoothedState.current.isSpeaking = true;
  } else {
    const elapsed = now - smoothedState.current.lastSpeakingTime;
    if (elapsed > settings.mouthCloseDelay) {
      smoothedState.current.isSpeaking = false;
    }
  }

  const isSpeaking = smoothedState.current.isSpeaking;
  const mouthNormalizedLevel = faceData.detected
    ? Math.min(
        1,
        Math.max(
          0,
          (currentJaw - settings.mouthSensitivity * 0.45) /
            Math.max(0.05, settings.mouthSensitivity * 1.65)
        )
      )
    : 0;

  // 2. Head angles smoothing and clamping (max 8 deg)
  const targetRoll = faceData.detected ? faceData.roll * settings.headIntensity : 0;
  const targetPitch = faceData.detected ? faceData.pitch * settings.headIntensity : 0;
  const targetYaw = faceData.detected ? faceData.yaw * settings.headIntensity : 0;

  smoothedState.current.roll += (targetRoll - smoothedState.current.roll) * alpha;
  smoothedState.current.pitch += (targetPitch - smoothedState.current.pitch) * alpha;
  smoothedState.current.yaw += (targetYaw - smoothedState.current.yaw) * alpha;

  const roll = Math.max(-8, Math.min(8, smoothedState.current.roll));
  const pitch = Math.max(-5, Math.min(5, smoothedState.current.pitch));
  const yaw = Math.max(-8, Math.min(8, smoothedState.current.yaw));

  // Subtle organic speech lift preserving original PNG/GIF aspect ratio & proportions
  const speechMicroLift = isSpeaking ? -Math.min(2.5, mouthNormalizedLevel * 2.5) : 0;
  const translateY = Math.max(-6, Math.min(6, pitch * 0.8)) + speechMicroLift;
  const translateX = Math.max(-8, Math.min(8, yaw * 0.9));

  // 3. Eye blink check
  const avgBlink = (faceData.eyeBlinkLeft + faceData.eyeBlinkRight) / 2;
  const isBlinking = faceData.detected && avgBlink > 0.45;

  // 4. Determine active expression slot across all 6 MediaPipe states:
  //    SILENT, SPEAKING, BLINK (eyesClosed), BOCCA A, BOCCA E, BOCCA O
  const oShapeScore = Math.max(faceData.mouthPucker || 0, faceData.mouthFunnel || 0);
  const eShapeScore = Math.max(faceData.mouthSmile || 0, faceData.mouthStretch || 0);

  const activeSlot: CharacterSlotKey = useMemo(() => {
    if (!character) return 'silent';

    if (isBlinking && !isSpeaking && hasCharacterSlot(character, 'eyesClosed')) {
      return 'eyesClosed';
    }

    if (isSpeaking) {
      if (faceData.detected && oShapeScore > 0.42 && hasCharacterSlot(character, 'mouthO')) {
        return 'mouthO';
      }
      if (faceData.detected && eShapeScore > 0.42 && hasCharacterSlot(character, 'mouthE')) {
        return 'mouthE';
      }
      if (
        faceData.detected &&
        currentJaw > settings.mouthSensitivity * 1.85 &&
        hasCharacterSlot(character, 'mouthA')
      ) {
        return 'mouthA';
      }
      if (hasCharacterSlot(character, 'speaking')) {
        return 'speaking';
      }
      return 'silent';
    }

    if (hasCharacterSlot(character, 'silent')) {
      return 'silent';
    }
    return hasCharacterSlot(character, 'speaking') ? 'speaking' : 'silent';
  }, [
    character,
    isSpeaking,
    isBlinking,
    faceData.detected,
    oShapeScore,
    eShapeScore,
    currentJaw,
    settings.mouthSensitivity,
  ]);

  const currentImageSrc = useMemo(() => {
    if (!character || !character.images) return '';
    return character.images[activeSlot] || character.images.speaking || character.images.silent || '';
  }, [character, activeSlot]);

  // Uniform scale preserves exact aspect ratio and dimensions
  const anchorX = (character?.anchorX ?? 0.5) * 100;
  const anchorY = (character?.anchorY ?? 0.85) * 100;

  const transformStyle: React.CSSProperties = useMemo(() => {
    return {
      transformOrigin: `${anchorX}% ${anchorY}%`,
      transform: `translate(${translateX}px, ${translateY}px) rotate(${roll}deg) scale(${settings.characterScale})`,
      transition: 'none',
      willChange: 'transform',
    };
  }, [anchorX, anchorY, translateX, translateY, roll, settings.characterScale]);

  return {
    activeSlot,
    currentImageSrc,
    isSpeaking,
    isBlinking,
    mouthPercent: Math.min(100, Math.round(mouthNormalizedLevel * 100)),
    transformStyle,
    smoothedAngles: { roll, pitch, yaw },
  };
}
