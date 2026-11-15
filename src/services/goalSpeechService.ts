export interface GoalSpeechCallbacks {
  onGoalDetected: (transcript: string) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onStatusChange?: (status: 'idle' | 'listening' | 'error') => void;
  onError?: (message: string) => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

// Matches spoken variants of "GOL" and "GOAL" (including elongated commentary shouts like "GOOOL", "GOOOAL")
// while strictly ignoring standalone vowels like "A", "E", "O" or unrelated words like "angolo" or "gola".
const GOAL_KEYWORD_REGEX = /(?:^|[^\p{L}])go+a*l+(?=$|[^\p{L}])/giu;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function isGoalSpeechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function countGoalMatches(transcript: string): number {
  if (!transcript) return 0;
  const matches = transcript.match(GOAL_KEYWORD_REGEX);
  return matches ? matches.length : 0;
}

export function containsGoalKeyword(transcript: string): boolean {
  return countGoalMatches(transcript) > 0;
}

export class GoalSpeechRecognizer {
  private recognition: SpeechRecognitionInstance | null = null;
  private isRunning = false;
  private shouldKeepListening = false;
  private restartTimer: number | null = null;
  private handledCountsByIndex = new Map<number, number>();
  private lastTriggeredAt = 0;
  private callbacks: GoalSpeechCallbacks;

  constructor(callbacks: GoalSpeechCallbacks) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: GoalSpeechCallbacks) {
    this.callbacks = callbacks;
  }

  public start(): boolean {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      this.callbacks.onStatusChange?.('error');
      this.callbacks.onError?.(
        'Riconoscimento vocale non supportato in questo browser. Usa Google Chrome su desktop.'
      );
      return false;
    }

    this.shouldKeepListening = true;
    this.clearRestartTimer();
    return this.startSession(Ctor);
  }

  private startSession(Ctor: SpeechRecognitionCtor): boolean {
    if (!this.shouldKeepListening || this.isRunning) return true;

    try {
      this.handledCountsByIndex.clear();
      const rec = new Ctor();
      rec.lang = 'it-IT';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (!this.shouldKeepListening) {
          try {
            rec.abort();
          } catch {
            // ignore
          }
          return;
        }
        this.isRunning = true;
        this.callbacks.onStatusChange?.('listening');
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        if (!this.shouldKeepListening) return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const rawTranscript = result?.[0]?.transcript || '';
          const trimmed = rawTranscript.trim();
          if (!trimmed) continue;

          this.callbacks.onTranscript?.(trimmed, Boolean(result.isFinal));

          const matchCount = countGoalMatches(trimmed);
          const prevCount = this.handledCountsByIndex.get(i) ?? 0;

          if (matchCount > prevCount) {
            this.handledCountsByIndex.set(i, matchCount);
            const now = performance.now();
            // Brief cooldown prevents double-firing when interim transcript fluctuates
            if (now - this.lastTriggeredAt > 600) {
              this.lastTriggeredAt = now;
              this.callbacks.onGoalDetected(trimmed);
            }
          }
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
        const errCode = event?.error || 'unknown';

        // 'no-speech' and 'aborted' are normal lifecycle events during continuous listening
        if (errCode === 'no-speech' || errCode === 'aborted') {
          return;
        }

        if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
          this.shouldKeepListening = false;
          this.isRunning = false;
          this.callbacks.onStatusChange?.('error');
          this.callbacks.onError?.(
            'Permesso microfono negato per il riconoscimento vocale. Consenti il microfono nella barra di Chrome.'
          );
          return;
        }

        if (errCode === 'audio-capture') {
          this.shouldKeepListening = false;
          this.isRunning = false;
          this.callbacks.onStatusChange?.('error');
          this.callbacks.onError?.(
            'Nessun microfono disponibile per il riconoscimento vocale.'
          );
          return;
        }

        if (errCode === 'network') {
          this.callbacks.onError?.(
            'Errore di rete del riconoscimento vocale Chrome: nuovo tentativo automatico...'
          );
        }
      };

      rec.onend = () => {
        this.isRunning = false;
        this.recognition = null;
        if (this.shouldKeepListening) {
          this.clearRestartTimer();
          this.restartTimer = window.setTimeout(() => {
            const NextCtor = getSpeechRecognitionCtor();
            if (this.shouldKeepListening && NextCtor) {
              this.startSession(NextCtor);
            }
          }, 220);
        } else {
          this.callbacks.onStatusChange?.('idle');
        }
      };

      this.recognition = rec;
      rec.start();
      return true;
    } catch (err) {
      this.isRunning = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.callbacks.onStatusChange?.('error');
      this.callbacks.onError?.(`Impossibile avviare il riconoscimento vocale: ${msg}`);
      return false;
    }
  }

  private clearRestartTimer() {
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  public stop() {
    this.shouldKeepListening = false;
    this.clearRestartTimer();
    this.handledCountsByIndex.clear();
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        try {
          this.recognition.stop();
        } catch {
          // ignore
        }
      }
      this.recognition = null;
    }
    this.isRunning = false;
    this.callbacks.onStatusChange?.('idle');
  }
}
