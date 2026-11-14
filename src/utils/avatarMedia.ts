import {
  AvatarMediaType,
  Character,
  CharacterSlotKey,
  MediaValidationInfo,
} from '../types/vtuber';

export const CHARACTER_SLOTS: CharacterSlotKey[] = [
  'silent',
  'speaking',
  'eyesClosed',
  'mouthA',
  'mouthE',
  'mouthO',
];

export function hasCharacterSlot(
  character: Character | null | undefined,
  slot: CharacterSlotKey
): boolean {
  if (!character) return false;
  return Boolean(character.images?.[slot] || character.mediaKeys?.[slot]);
}

export function inferMediaType(
  character: Character | null | undefined,
  slot: CharacterSlotKey,
  resolvedUrl?: string
): AvatarMediaType {
  const explicit = character?.mediaTypes?.[slot];
  if (explicit) return explicit;

  const src = resolvedUrl || character?.images?.[slot] || '';
  if (
    src.startsWith('data:video/') ||
    src.toLowerCase().includes('.webm')
  ) {
    return 'video';
  }
  if (
    src.startsWith('data:image/gif') ||
    src.toLowerCase().includes('.gif')
  ) {
    return 'gif';
  }
  return 'image';
}

export function resolveCharacterMediaUrls(
  character: Character | null | undefined,
  mediaKeyUrlMap: Record<string, string>
): Partial<Record<CharacterSlotKey, string>> {
  const resolved: Partial<Record<CharacterSlotKey, string>> = {};
  if (!character) return resolved;

  for (const slot of CHARACTER_SLOTS) {
    const mediaKey = character.mediaKeys?.[slot];
    if (mediaKey && mediaKeyUrlMap[mediaKey]) {
      resolved[slot] = mediaKeyUrlMap[mediaKey];
    } else if (character.images?.[slot]) {
      resolved[slot] = character.images[slot];
    }
  }
  return resolved;
}

export function checkBrowserWebMSupport(): {
  supported: boolean;
  vp9: boolean;
  vp8: boolean;
} {
  if (typeof document === 'undefined') {
    return { supported: false, vp9: false, vp8: false };
  }
  const v = document.createElement('video');
  const vp9 = Boolean(v.canPlayType('video/webm; codecs="vp9"'));
  const vp8 = Boolean(v.canPlayType('video/webm; codecs="vp8"'));
  const generic = Boolean(v.canPlayType('video/webm'));
  return {
    supported: vp9 || vp8 || generic,
    vp9,
    vp8,
  };
}

/**
 * Probes an uploaded WebM video file in the browser:
 * 1) Checks WebM codec playback capability and actual frame decoding.
 * 2) Draws a decoded frame onto a clean transparent 2D canvas and samples alpha values
 *    across the frame to verify whether alpha transparency actually works.
 */
export async function validateWebMVideoFile(
  file: File
): Promise<MediaValidationInfo> {
  const support = checkBrowserWebMSupport();
  if (!support.supported) {
    return {
      mediaType: 'video',
      playable: false,
      transparency: 'unsupported',
      message:
        'Questo browser non supporta la riproduzione di video WebM. Usa Chrome aggiornato oppure carica PNG/GIF.',
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const result = await new Promise<MediaValidationInfo>((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';

      let settled = false;
      const finish = (info: MediaValidationInfo) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        video.pause();
        video.removeAttribute('src');
        video.load();
        resolve(info);
      };

      const timeoutId = window.setTimeout(() => {
        finish({
          mediaType: 'video',
          playable: false,
          transparency: 'unsupported',
          message:
            'Timeout durante la decodifica del video WebM. Verifica che il codec sia VP8 o VP9 valido.',
        });
      }, 6000);

      video.onerror = () => {
        finish({
          mediaType: 'video',
          playable: false,
          transparency: 'unsupported',
          message:
            'Il browser non riesce a riprodurre questo file WebM (codec non supportato o file danneggiato). Esporta in WebM VP9/VP8.',
        });
      };

      const inspectAlphaOnFrame = () => {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) {
          finish({
            mediaType: 'video',
            playable: false,
            transparency: 'unsupported',
            message:
              'Nessuna traccia video valida rilevata nel file WebM.',
          });
          return;
        }

        try {
          const sampleW = Math.min(160, vw);
          const sampleH = Math.min(160, vh);
          const canvas = document.createElement('canvas');
          canvas.width = sampleW;
          canvas.height = sampleH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            finish({
              mediaType: 'video',
              playable: true,
              transparency: 'unknown',
              width: vw,
              height: vh,
              message:
                'Video riproducibile, ma impossibile verificare il canale Alpha in questo contesto.',
            });
            return;
          }

          ctx.clearRect(0, 0, sampleW, sampleH);
          ctx.drawImage(video, 0, 0, sampleW, sampleH);
          const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

          let transparentPixels = 0;
          let opaquePixels = 0;
          const totalPixels = sampleW * sampleH;

          // Step by 4 pixels for fast inspection (~4000 samples)
          for (let i = 3; i < data.length; i += 16) {
            const alpha = data[i];
            if (alpha < 250) {
              transparentPixels++;
            } else {
              opaquePixels++;
            }
          }

          const hasVisibleContent = opaquePixels > 0 || transparentPixels < Math.floor(totalPixels / 4);
          if (transparentPixels > 0 && hasVisibleContent) {
            finish({
              mediaType: 'video',
              playable: true,
              transparency: 'transparent',
              width: vw,
              height: vh,
              message: `WebM VP8/VP9 pronto con trasparenza Alpha rilevata (${vw}x${vh}).`,
            });
          } else {
            finish({
              mediaType: 'video',
              playable: true,
              transparency: 'opaque',
              width: vw,
              height: vh,
              message:
                'Video riproducibile, ma nessuna trasparenza rilevata (canale Alpha assente o non supportato dal codec). Lo sfondo del video potrebbe coprire la scenografia.',
            });
          }
        } catch {
          finish({
            mediaType: 'video',
            playable: true,
            transparency: 'unknown',
            width: vw,
            height: vh,
            message:
              'Video riproducibile; verifica visivamente la trasparenza nell’anteprima.',
          });
        }
      };

      video.onloadeddata = () => {
        if (video.duration && isFinite(video.duration) && video.duration > 0.2) {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            inspectAlphaOnFrame();
          };
          video.addEventListener('seeked', onSeeked);
          try {
            video.currentTime = Math.min(0.15, video.duration * 0.2);
          } catch {
            video.removeEventListener('seeked', onSeeked);
            inspectAlphaOnFrame();
          }
        } else {
          inspectAlphaOnFrame();
        }
      };

      video.src = objectUrl;
      video.load();
    });

    return result;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
