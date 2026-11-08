import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { FaceData } from '../types/vtuber';

// Standard WASM & Model CDN URLs from Google MediaPipe
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_ASSET = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerInstance: FaceLandmarker | null = null;
let isInitializing = false;
let currentDelegate: 'GPU' | 'CPU' = 'CPU'; // Default CPU for maximum compatibility on PCs without dedicated GPU

export interface InitLandmarkerOptions {
  preferGpu?: boolean;
  onProgress?: (stage: string) => void;
}

export async function getFaceLandmarker(options?: InitLandmarkerOptions): Promise<FaceLandmarker> {
  if (landmarkerInstance) {
    return landmarkerInstance;
  }

  if (isInitializing) {
    // Wait for the in-flight initialization
    while (isInitializing && !landmarkerInstance) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (landmarkerInstance) return landmarkerInstance;
  }

  isInitializing = true;
  options?.onProgress?.('Caricamento moduli MediaPipe Vision...');

  try {
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

    // Try GPU first if requested, but fallback smoothly to CPU for PCs without dedicated GPU
    const delegatesToTry: ('GPU' | 'CPU')[] = options?.preferGpu ? ['GPU', 'CPU'] : ['CPU', 'GPU'];

    let lastError: unknown = null;
    for (const delegate of delegatesToTry) {
      try {
        options?.onProgress?.(`Inizializzazione Face Landmarker (${delegate})...`);
        landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET,
            delegate: delegate,
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
        currentDelegate = delegate;
        console.log(`[MediaPipe] FaceLandmarker avviato con successo [Delegate: ${delegate}]`);
        break;
      } catch (err) {
        console.warn(`[MediaPipe] Inizializzazione con delegate ${delegate} fallita, tentativo successivo...`, err);
        lastError = err;
      }
    }

    if (!landmarkerInstance) {
      throw lastError || new Error('Impossibile inizializzare FaceLandmarker');
    }

    return landmarkerInstance;
  } finally {
    isInitializing = false;
  }
}

export function getCurrentDelegate(): 'GPU' | 'CPU' {
  return currentDelegate;
}

/**
 * Parses MediaPipe FaceLandmarkerResult into normalized FaceData
 */
export function extractFaceData(
  result: FaceLandmarkerResult,
  timestamp: number
): FaceData {
  if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
    return {
      detected: false,
      jawOpen: 0,
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0,
      mouthSmile: 0,
      mouthPucker: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
      timestamp,
    };
  }

  // 1. Extract Blendshapes
  let jawOpen = 0;
  let eyeBlinkLeft = 0;
  let eyeBlinkRight = 0;
  let smileLeft = 0;
  let smileRight = 0;
  let mouthPucker = 0;

  if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
    const categories = result.faceBlendshapes[0].categories;
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      switch (cat.categoryName) {
        case 'jawOpen':
          jawOpen = cat.score;
          break;
        case 'eyeBlinkLeft':
          eyeBlinkLeft = cat.score;
          break;
        case 'eyeBlinkRight':
          eyeBlinkRight = cat.score;
          break;
        case 'mouthSmileLeft':
          smileLeft = cat.score;
          break;
        case 'mouthSmileRight':
          smileRight = cat.score;
          break;
        case 'mouthPucker':
          mouthPucker = cat.score;
          break;
      }
    }
  }

  // 2. Extract Head Angles (Roll, Pitch, Yaw)
  let roll = 0;
  let pitch = 0;
  let yaw = 0;

  // Method A: Facial Transformation Matrix (if available)
  if (
    result.facialTransformationMatrixes &&
    result.facialTransformationMatrixes.length > 0 &&
    result.facialTransformationMatrixes[0].data.length >= 16
  ) {
    const m = result.facialTransformationMatrixes[0].data;
    // Extract Euler angles from 4x4 matrix
    // R = [m0 m1 m2; m4 m5 m6; m8 m9 m10]
    // Yaw around Y, Pitch around X, Roll around Z
    const sy = Math.sqrt(m[0] * m[0] + m[4] * m[4]);
    const singular = sy < 1e-6;

    if (!singular) {
      pitch = Math.atan2(m[6], m[10]) * (180 / Math.PI);
      yaw = Math.atan2(-m[2], sy) * (180 / Math.PI);
      roll = Math.atan2(m[1], m[0]) * (180 / Math.PI);
    } else {
      pitch = Math.atan2(-m[9], m[5]) * (180 / Math.PI);
      yaw = Math.atan2(-m[2], sy) * (180 / Math.PI);
      roll = 0;
    }
  } else {
    // Method B: Landmarks geometry
    // Landmark 33 (left eye outer), 263 (right eye outer), 1 (nose tip), 152 (chin), 10 (forehead)
    const landmarks = result.faceLandmarks[0];
    const leftEye = landmarks[33] || landmarks[130];
    const rightEye = landmarks[263] || landmarks[359];
    const noseTip = landmarks[1];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    if (leftEye && rightEye) {
      const dx = rightEye.x - leftEye.x;
      const dy = rightEye.y - leftEye.y;
      roll = Math.atan2(dy, dx) * (180 / Math.PI);
    }

    if (noseTip && leftEye && rightEye) {
      const eyeMidX = (leftEye.x + rightEye.x) / 2;
      const eyeDist = Math.abs(rightEye.x - leftEye.x) || 0.1;
      yaw = ((noseTip.x - eyeMidX) / eyeDist) * 45;
    }

    if (noseTip && forehead && chin) {
      const faceHeight = Math.abs(chin.y - forehead.y) || 0.1;
      const midY = (forehead.y + chin.y) / 2;
      pitch = ((noseTip.y - midY) / faceHeight) * 45;
    }
  }

  // Constrain rotation to realistic VTuber limits (as explicitly requested: max 8 deg)
  // Clean clamp to [-8, 8] for roll and yaw, and [-6, 6] for pitch
  const clampedRoll = Math.max(-8, Math.min(8, roll));
  const clampedPitch = Math.max(-6, Math.min(6, pitch));
  const clampedYaw = Math.max(-8, Math.min(8, yaw));

  return {
    detected: true,
    jawOpen: Math.max(0, Math.min(1, jawOpen)),
    eyeBlinkLeft: Math.max(0, Math.min(1, eyeBlinkLeft)),
    eyeBlinkRight: Math.max(0, Math.min(1, eyeBlinkRight)),
    mouthSmile: Math.max(0, Math.min(1, (smileLeft + smileRight) / 2)),
    mouthPucker: Math.max(0, Math.min(1, mouthPucker)),
    pitch: clampedPitch,
    yaw: clampedYaw,
    roll: clampedRoll,
    timestamp,
  };
}
