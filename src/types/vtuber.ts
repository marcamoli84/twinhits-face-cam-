export type CharacterSlotKey =
  | 'silent'
  | 'speaking'
  | 'mouthA'
  | 'mouthE'
  | 'mouthO'
  | 'eyesClosed';

export type AvatarMediaType = 'image' | 'gif' | 'video';

export type TransparencyStatus = 'transparent' | 'opaque' | 'unsupported' | 'unknown';

export interface MediaValidationInfo {
  mediaType: AvatarMediaType;
  playable: boolean;
  transparency: TransparencyStatus;
  width?: number;
  height?: number;
  message?: string;
}

export interface CharacterImages {
  silent: string;      // Base64 PNG/GIF or image URL - Closed mouth
  speaking: string;    // Base64 PNG/GIF or image URL - Open mouth
  mouthA?: string;     // Optional open 'A' mouth
  mouthE?: string;     // Optional open 'E' mouth
  mouthO?: string;     // Optional open 'O' mouth
  eyesClosed?: string; // Optional closed eyes (blink)
}

export interface Character {
  id: string;
  name: string;
  description?: string;
  isPreset?: boolean;
  images: CharacterImages;
  mediaTypes?: Partial<Record<CharacterSlotKey, AvatarMediaType>>;
  mediaKeys?: Partial<Record<CharacterSlotKey, string>>; // IndexedDB keys for WebM/large GIF blobs
  mediaChecks?: Partial<Record<CharacterSlotKey, MediaValidationInfo>>;
  anchorX?: number; // 0 to 1, default 0.5
  anchorY?: number; // 0 to 1, default 0.8
}

export interface TrackingSettings {
  mouthSensitivity: number;    // 0.05 to 0.50 (mouth opening threshold)
  smoothing: number;           // 0.1 to 0.95 (exponential moving average)
  headIntensity: number;       // 0 to 1.5 (multiplier, clamped to 8 deg max)
  mouthCloseDelay: number;     // 50 to 500 ms (hold open mouth to prevent flicker)
  targetFps: number;           // 15 to 30 FPS
  characterScale: number;      // 0.5 to 2.0
  characterPosX: number;       // 0 to 100 percentage
  characterPosY: number;       // 0 to 100 percentage
}

export interface FaceData {
  detected: boolean;
  jawOpen: number;       // 0.0 to 1.0
  eyeBlinkLeft: number;  // 0.0 to 1.0
  eyeBlinkRight: number; // 0.0 to 1.0
  mouthSmile: number;    // 0.0 to 1.0
  mouthPucker: number;   // 0.0 to 1.0
  mouthFunnel?: number;  // 0.0 to 1.0
  mouthStretch?: number; // 0.0 to 1.0
  pitch: number;         // degrees - head up/down
  yaw: number;           // degrees - head left/right
  roll: number;          // degrees - head tilt
  timestamp: number;
}

export type LiveMode = 'solo' | 'dual' | 'scenography';
export type AspectRatioMode = '16:9' | '9:16' | 'fill';
export type BackgroundMode = 'dark' | 'green' | 'stadium' | 'scenography' | 'custom';
export type ScenographyTheme =
  | 'san_siro_twinhits'
  | 'studio_led'
  | 'stadium_future'
  | 'energy_arena';

export interface ScenographySettings {
  enabled: boolean;
  theme: ScenographyTheme; // 'san_siro_twinhits' | 'studio_led' | 'stadium_future' | 'energy_arena'
  motionIntensity: number; // 0.0 to 1.5 (scale movement)
  brightness: number;      // 0.3 to 1.5 (ambient and light intensity)
  smokeIntensity: number;  // 0.0 to 1.0 (smoke puffs quantity)
  speed: number;           // 0.2 to 2.5 (animation pace)
  isFrozen: boolean;       // true = static frame, zero animation CPU
  showLedBoard: boolean;   // scrolling LED stadium ribbon
  ledText: string;         // customizable ribbon text
}

export interface DualHostSettings {
  webcamWidthPercent: number;  // 20 to 60%
  webcamPosition: 'left' | 'right';
  webcamRounded: boolean;
  webcamBorderColor: string;
  webcamLabel: string;
  avatarLabel: string;
}

export type StadiumBackgroundPreset =
  | 'none'
  | 'studio_rossonero'
  | 'stadio_reale'
  | 'stadio_reale_sfumato'
  | 'custom_image'
  | 'custom_video';

export interface StadiumBackgroundSettings {
  preset: StadiumBackgroundPreset;
  opacity: number;             // 0.1 to 1.0
  blur: number;                // 0 to 24 px
  brightness: number;          // 0.2 to 1.5
  overlayDarkness: number;     // 0.0 to 0.85
  customMediaVersion: number;  // bumped whenever custom media in IndexedDB changes
  customImageName?: string;
  customVideoName?: string;
}

