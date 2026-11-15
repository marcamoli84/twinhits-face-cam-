import * as Vosk from 'vosk-browser';
import type { KaldiRecognizer, Model } from 'vosk-browser';
import { GoalSpeechStatus } from '../types/vtuber';
import { countGoalMatches, GoalSpeechCallbacks } from './goalSpeechService';
import { loadVoskModelBlob } from './characterStorage';

export const BUNDLED_VOSK_MODEL_PATHS = [
  './models/vosk-model-small-it-0.22.tar.gz',
  './models/model.tar.gz',
];

export interface VoskModelProbeResult {
  available: boolean;
  source: 'indexeddb' | 'bundled' | 'none';
  resolvedUrl: string | null;
}

function resolveCandidateUrl(relativePath: string): string {
  if (typeof window === 'undefined') return relativePath;
  return new URL(relativePath, window.location.href).href;
}

async function isGzipTarModelUrlValid(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return false;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    // Vite dev / SPA static servers return text/html 200 for missing paths
    if (contentType.includes('text/html')) {
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }
      return false;
    }
    const reader = res.body?.getReader();
    if (reader) {
      const first = await reader.read();
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      if (!first.value || first.value.length < 2) return false;
      // Gzip magic bytes: 0x1F 0x8B
      return first.value[0] === 0x1f && first.value[1] === 0x8b;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 2) return false;
    const bytes = new Uint8Array(buf, 0, 2);
    return bytes[0] === 0x1f && bytes[1] === 0x8b;
  } catch {
    return false;
  }
}

export async function probeVoskModelAvailability(): Promise<VoskModelProbeResult> {
  const customBlob = await loadVoskModelBlob();
  if (customBlob && customBlob.size > 1024) {
    return {
      available: true,
      source: 'indexeddb',
      resolvedUrl: null,
    };
  }

  for (const rel of BUNDLED_VOSK_MODEL_PATHS) {
    const abs = resolveCandidateUrl(rel);
    const valid = await isGzipTarModelUrlValid(abs);
    if (valid) {
      return {
        available: true,
        source: 'bundled',
        resolvedUrl: abs,
      };
    }
  }

  return {
    available: false,
    source: 'none',
    resolvedUrl: null,
  };
}

function loadVoskModelFromUrl(modelUrl: string): Promise<Model> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const model = new Vosk.Model(modelUrl, -1);

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        model.terminate();
      } catch {
        // ignore
      }
      reject(new Error('Timeout caricamento modello Vosk offline.'));
    }, 30000);

    model.on('load', (message) => {
      if (settled) return;
      if (message.event === 'load' && message.result) {
        settled = true;
        clearTimeout(timer);
        resolve(model);
      } else if (message.event === 'load' && !message.result) {
        settled = true;
        clearTimeout(timer);
        try {
          model.terminate();
        } catch {
          // ignore
        }
        reject(new Error('Modello Vosk non valido o corrotto.'));
      }
    });

    model.on('error', (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        model.terminate();
      } catch {
        // ignore
      }
      const errText =
        message.event === 'error' && message.error
          ? message.error
          : 'Errore caricamento archivio modello Vosk.';
      reject(new Error(errText));
    });
  });
}

export class VoskGoalRecognizer {
  private callbacks: GoalSpeechCallbacks;
  private model: Model | null = null;
  private modelSourceKey: string | null = null;
  private modelObjectUrl: string | null = null;
  private recognizer: KaldiRecognizer | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private silentGainNode: GainNode | null = null;
  private isListening = false;
  private startSequence = 0;
  private handledPartialMatches = 0;
  private lastGoalTriggerAt = 0;

  constructor(callbacks: GoalSpeechCallbacks) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: GoalSpeechCallbacks) {
    this.callbacks = callbacks;
  }

  public invalidateCachedModel() {
    this.disposeAudioGraph();
    if (this.recognizer) {
      try {
        this.recognizer.remove();
      } catch {
        // ignore
      }
      this.recognizer = null;
    }
    if (this.model) {
      try {
        this.model.terminate();
      } catch {
        // ignore
      }
      this.model = null;
    }
    if (this.modelObjectUrl) {
      URL.revokeObjectURL(this.modelObjectUrl);
      this.modelObjectUrl = null;
    }
    this.modelSourceKey = null;
  }

  private async ensureModelLoaded(): Promise<Model> {
    const customBlob = await loadVoskModelBlob();
    if (customBlob && customBlob.size > 1024) {
      const key = `idb:${customBlob.size}:${customBlob.type}`;
      if (this.model && this.model.ready && this.modelSourceKey === key) {
        return this.model;
      }
      this.invalidateCachedModel();
      const objUrl = URL.createObjectURL(customBlob);
      this.modelObjectUrl = objUrl;
      const loaded = await loadVoskModelFromUrl(objUrl);
      this.model = loaded;
      this.modelSourceKey = key;
      return loaded;
    }

    for (const rel of BUNDLED_VOSK_MODEL_PATHS) {
      const absUrl = resolveCandidateUrl(rel);
      const valid = await isGzipTarModelUrlValid(absUrl);
      if (!valid) continue;

      const key = `url:${absUrl}`;
      if (this.model && this.model.ready && this.modelSourceKey === key) {
        return this.model;
      }
      this.invalidateCachedModel();
      const loaded = await loadVoskModelFromUrl(absUrl);
      this.model = loaded;
      this.modelSourceKey = key;
      return loaded;
    }

    throw new ModelUnavailableError(
      'Modello italiano Vosk non trovato. Posiziona vosk-model-small-it-0.22.tar.gz in public/models/ oppure importalo dal pannello.'
    );
  }

  public async start(selectedMicId?: string): Promise<boolean> {
    const mySeq = ++this.startSequence;
    this.stopAudioOnly();
    this.handledPartialMatches = 0;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.emitFailure('unsupported', 'Acquisizione microfono non supportata in questo ambiente.');
      return false;
    }

    this.callbacks.onStatusChange?.('loading_model');

    let model: Model;
    try {
      model = await this.ensureModelLoaded();
    } catch (err) {
      if (mySeq !== this.startSequence) return false;
      const msg = err instanceof Error ? err.message : String(err);
      if (err instanceof ModelUnavailableError) {
        this.emitFailure('model_unavailable', msg);
      } else {
        this.emitFailure('model_unavailable', `Errore caricamento modello offline: ${msg}`);
      }
      return false;
    }

    if (mySeq !== this.startSequence) return false;

    // Shared-mode audio capture: never takes exclusive lock and never interrupts TikTok LIVE Studio
    let stream: MediaStream;
    try {
      const audioConstraints: MediaTrackConstraints = {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(selectedMicId ? { deviceId: { ideal: selectedMicId } } : {}),
      };
      stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: audioConstraints,
      });
    } catch (err) {
      if (mySeq !== this.startSequence) return false;
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (lower.includes('notallowed') || lower.includes('permission')) {
        this.emitFailure(
          'permission_denied',
          'Permesso microfono negato. Consenti il microfono nelle impostazioni Windows/Electron o Chrome.'
        );
      } else if (
        lower.includes('notfound') ||
        lower.includes('devicesnotfound') ||
        lower.includes('notreadable') ||
        lower.includes('could not start audio source') ||
        lower.includes('device in use')
      ) {
        this.emitFailure(
          'mic_unavailable',
          'Microfono non disponibile o scollegato. Verifica il dispositivo selezionato.'
        );
      } else {
        this.emitFailure('error', `Errore apertura microfono: ${msg}`);
      }
      return false;
    }

    if (mySeq !== this.startSequence) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }

    try {
      let ctx: AudioContext;
      try {
        ctx = new AudioContext({ sampleRate: 16000 });
      } catch {
        ctx = new AudioContext();
      }
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const recognizer = new model.KaldiRecognizer(ctx.sampleRate);
      recognizer.setWords(false);

      recognizer.on('partialresult', (message) => {
        if (!this.isListening || mySeq !== this.startSequence) return;
        if (message.event !== 'partialresult') return;
        const partial = (message.result?.partial || '').trim();
        if (!partial) return;

        this.callbacks.onTranscript?.(partial, false);
        const matches = countGoalMatches(partial);
        if (matches > this.handledPartialMatches) {
          this.handledPartialMatches = matches;
          const now = performance.now();
          if (now - this.lastGoalTriggerAt > 600) {
            this.lastGoalTriggerAt = now;
            this.callbacks.onGoalDetected(partial);
          }
        }
      });

      recognizer.on('result', (message) => {
        if (!this.isListening || mySeq !== this.startSequence) return;
        if (message.event !== 'result') return;
        const text = (message.result?.text || '').trim();
        const matches = text ? countGoalMatches(text) : 0;

        if (text) {
          this.callbacks.onTranscript?.(text, true);
        }

        if (matches > this.handledPartialMatches) {
          const now = performance.now();
          if (now - this.lastGoalTriggerAt > 600) {
            this.lastGoalTriggerAt = now;
            this.callbacks.onGoalDetected(text);
          }
        }
        // Reset utterance counter for the next spoken phrase
        this.handledPartialMatches = 0;
      });

      recognizer.on('error', (message) => {
        if (mySeq !== this.startSequence) return;
        const errMsg = message.event === 'error' ? message.error : 'Errore interno Vosk.';
        this.stopAudioOnly();
        this.emitFailure('error', `Errore motore Vosk: ${errMsg}`);
      });

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      // Mute output completely so microphone voice NEVER plays into speakers or echoes into TikTok LIVE Studio
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;

      processor.onaudioprocess = (event) => {
        if (!this.isListening || mySeq !== this.startSequence || !this.recognizer) return;
        try {
          this.recognizer.acceptWaveform(event.inputBuffer);
        } catch {
          // ignore transient buffer issues
        }
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = () => {
          if (this.mediaStream !== stream || mySeq !== this.startSequence) return;
          this.stopAudioOnly();
          this.emitFailure(
            'mic_unavailable',
            'Microfono scollegato o segnale interrotto.'
          );
        };
      }

      this.mediaStream = stream;
      this.audioContext = ctx;
      this.recognizer = recognizer;
      this.sourceNode = source;
      this.processorNode = processor;
      this.silentGainNode = silentGain;
      this.isListening = true;
      this.callbacks.onStatusChange?.('listening');
      return true;
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      this.stopAudioOnly();
      const msg = err instanceof Error ? err.message : String(err);
      this.emitFailure('error', `Impossibile avviare ascolto offline Vosk: ${msg}`);
      return false;
    }
  }

  private emitFailure(status: GoalSpeechStatus, message: string) {
    this.isListening = false;
    this.callbacks.onStatusChange?.(status);
    this.callbacks.onError?.(message);
  }

  private disposeAudioGraph() {
    this.isListening = false;
    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try {
        this.processorNode.disconnect();
      } catch {
        // ignore
      }
      this.processorNode = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.silentGainNode) {
      try {
        this.silentGainNode.disconnect();
      } catch {
        // ignore
      }
      this.silentGainNode = null;
    }
    if (this.audioContext) {
      try {
        void this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }
  }

  private stopAudioOnly() {
    this.disposeAudioGraph();
    if (this.recognizer) {
      try {
        this.recognizer.remove();
      } catch {
        // ignore
      }
      this.recognizer = null;
    }
  }

  public stop() {
    this.startSequence++;
    this.stopAudioOnly();
    this.handledPartialMatches = 0;
    this.callbacks.onStatusChange?.('idle');
  }

  public destroy() {
    this.stop();
    this.invalidateCachedModel();
  }
}

class ModelUnavailableError extends Error {}
