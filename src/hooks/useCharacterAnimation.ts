import { useRef, useMemo } from 'react';
import { Character, FaceData, TrackingSettings } from '../types/vtuber';

interface AnimationResult {
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

  // 1. Calculate mouth opening & speaking state with hold delay
  const rawJaw = faceData.detected ? faceData.jawOpen : 0;
  
  // Smoothing factor: higher = smoother, lower = snappier
  const alpha = 1 - Math.min(0.95, Math.max(0.05, settings.smoothing));

  // Exponential moving average for jaw
  smoothedState.current.jawOpen += (rawJaw - smoothedState.current.jawOpen) * alpha;
  const currentJaw = smoothedState.current.jawOpen;

  // Sensitivity threshold check
  const isCurrentlyOpen = currentJaw >= settings.mouthSensitivity;
  if (isCurrentlyOpen) {
    smoothedState.current.lastSpeakingTime = now;
    smoothedState.current.isSpeaking = true;
  } else {
    // Keep speaking for mouthCloseDelay ms to avoid fluttering speech
    const elapsed = now - smoothedState.current.lastSpeakingTime;
    if (elapsed > settings.mouthCloseDelay) {
      smoothedState.current.isSpeaking = false;
    }
  }

  const isSpeaking = smoothedState.current.isSpeaking;

  // 2. Head angles smoothing and clamping
  const targetRoll = faceData.detected ? faceData.roll * settings.headIntensity : 0;
  const targetPitch = faceData.detected ? faceData.pitch * settings.headIntensity : 0;
  const targetYaw = faceData.detected ? faceData.yaw * settings.headIntensity : 0;

  smoothedState.current.roll += (targetRoll - smoothedState.current.roll) * alpha;
  smoothedState.current.pitch += (targetPitch - smoothedState.current.pitch) * alpha;
  smoothedState.current.yaw += (targetYaw - smoothedState.current.yaw) * alpha;

  // Strict clamp to maximum 8 degrees as requested by user
  const roll = Math.max(-8, Math.min(8, smoothedState.current.roll));
  const pitch = Math.max(-5, Math.min(5, smoothedState.current.pitch));
  const yaw = Math.max(-8, Math.min(8, smoothedState.current.yaw));

  // Minimal vertical translation (max 6px), no bouncing
  const translateY = Math.max(-6, Math.min(6, pitch * 0.8));
  // Minimal horizontal translation (max 8px)
  const translateX = Math.max(-8, Math.min(8, yaw * 0.9));

  // 3. Eye blink check (if available in character)
  const avgBlink = (faceData.eyeBlinkLeft + faceData.eyeBlinkRight) / 2;
  const isBlinking = faceData.detected && avgBlink > 0.45;

  // 4. Determine image to display
  const currentImageSrc = useMemo(() => {
    if (!character || !character.images) return '';

    const imgs = character.images;

    // Prioritize blinking when mouth is silent and eyes are closed
    if (isBlinking && !isSpeaking && imgs.eyesClosed) {
      return imgs.eyesClosed;
    }

    if (isSpeaking) {
      // Check for advanced phonemes if available
      // Mouth 'O' (pucker / rounded)
      if (faceData.mouthPucker > 0.45 && imgs.mouthO) {
        return imgs.mouthO;
      }
      // Mouth 'E' (smiling while open)
      if (faceData.mouthSmile > 0.45 && imgs.mouthE) {
        return imgs.mouthE;
      }
      // Wide open 'A'
      if (currentJaw > settings.mouthSensitivity * 1.8 && imgs.mouthA) {
        return imgs.mouthA;
      }
      // Default open speaking mouth
      return imgs.speaking || imgs.silent || '';
    }

    // Default closed silent mouth
    return imgs.silent || imgs.speaking || '';
  }, [character, isSpeaking, isBlinking, faceData.mouthPucker, faceData.mouthSmile, currentJaw, settings.mouthSensitivity]);

  // CSS transform: pivot at bottom center (anchorX, anchorY) so head tilts naturally like a human neck
  const anchorX = (character?.anchorX ?? 0.5) * 100;
  const anchorY = (character?.anchorY ?? 0.85) * 100;

  const transformStyle: React.CSSProperties = useMemo(() => {
    return {
      transformOrigin: `${anchorX}% ${anchorY}%`,
      transform: `translate(${translateX}px, ${translateY}px) rotate(${roll}deg) scale(${settings.characterScale})`,
      transition: 'none', // Frame-by-frame rAF smoothed, avoid CSS transition lag
      willChange: 'transform',
    };
  }, [anchorX, anchorY, translateX, translateY, roll, settings.characterScale]);

  return {
    currentImageSrc,
    isSpeaking,
    isBlinking,
    mouthPercent: Math.min(100, Math.round((currentJaw / (settings.mouthSensitivity * 2)) * 100)),
    transformStyle,
    smoothedAngles: { roll, pitch, yaw },
  };
}
