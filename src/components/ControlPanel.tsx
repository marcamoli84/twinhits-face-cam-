import React from 'react';
import {
  TrackingSettings,
  LiveMode,
  AspectRatioMode,
  BackgroundMode,
  DualHostSettings,
  Character,
  ScenographySettings,
  StadiumBackgroundSettings,
  StadiumBackgroundPreset,
  CharacterSlotKey,
  GoalEnginePreference,
  GoalResolvedEngine,
  GoalSpeechStatus,
  AudioInputDeviceInfo,
  SpecialReactionType,
} from '../types/vtuber';
import { STADIUM_ASSETS } from '../utils/stadiumAssets';
import { CHARACTER_SLOTS, inferMediaType, resolveCharacterMediaUrls } from '../utils/avatarMedia';
import {
  Camera,
  Play,
  Square,
  Sliders,
  Tv,
  Layers,
  Palette,
  Maximize2,
  ExternalLink,
  Users,
  User,
  Settings2,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Flame,
  Wind,
  Sun,
  Snowflake,
  Film,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Droplets,
  Contrast,
  Trophy,
  Lock,
  Unlock,
  Mic,
} from 'lucide-react';

interface MediaDeviceInfoSimplified {
  deviceId: string;
  label: string;
}

interface ControlPanelProps {
  // Webcam & Tracking
  isTracking: boolean;
  onToggleTracking: () => void;
  availableDevices: MediaDeviceInfoSimplified[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onRefreshDevices: () => void;
  isLoadingMediaPipe: boolean;
  initProgress: string;
  cameraError?: string | null;
  onRetryCamera?: () => void;
  onStartSimulation?: () => void;
  webcamStream?: MediaStream | null;
  isFaceDetected?: boolean;

  // Characters
  characters: Character[];
  activeCharacterId: string;
  onSelectCharacter: (id: string) => void;
  onOpenCharacterModal: () => void;
  avatarMediaUrlMap?: Record<string, string>;

  // Sliders Settings
  settings: TrackingSettings;
  onUpdateSettings: (newSettings: Partial<TrackingSettings>) => void;
  onResetSettings: () => void;

  // Live Modes
  liveMode: LiveMode;
  onSetLiveMode: (mode: LiveMode) => void;
  aspectRatio: AspectRatioMode;
  onSetAspectRatio: (ratio: AspectRatioMode) => void;
  backgroundMode: BackgroundMode;
  onSetBackgroundMode: (bg: BackgroundMode) => void;

  // Scenography Settings
  scenographySettings: ScenographySettings;
  onUpdateScenographySettings: (newSettings: Partial<ScenographySettings>) => void;

  // Stadium Realistic Background Settings
  stadiumBgSettings: StadiumBackgroundSettings;
  onSelectStadiumPreset: (preset: StadiumBackgroundPreset) => void;
  onUpdateStadiumBgSettings: (newSettings: Partial<StadiumBackgroundSettings>) => void;
  onResetStadiumBgSettings: () => void;
  onUploadStadiumImage: (file: File) => void;
  onUploadStadiumVideo: (file: File) => void;
  onRemoveStadiumCustomImage: () => void;
  onRemoveStadiumCustomVideo: () => void;
  hasCustomStadiumImage: boolean;
  hasCustomStadiumVideo: boolean;

  // Dual Host
  dualSettings: DualHostSettings;
  onUpdateDualSettings: (newSettings: Partial<DualHostSettings>) => void;

  // Comandi Vocali Live (GOAL & Reazione Arrabbiata su riconoscitore condiviso)
  goalVoiceEnabled: boolean;
  onToggleGoalVoice: () => void;
  goalActive: boolean;
  angryVoiceEnabled: boolean;
  onToggleAngryVoice: () => void;
  angryActive: boolean;
  queuedReactionType: SpecialReactionType | null;
  goalSpeechStatus: GoalSpeechStatus;
  goalEnginePreference: GoalEnginePreference;
  goalResolvedEngine: GoalResolvedEngine;
  isElectronEnv: boolean;
  onChangeGoalEngine: (pref: GoalEnginePreference) => void;
  goalSpeechSupported: boolean;
  goalLastTranscript: string;
  detectedCommandLabel: string;
  goalLastEvent: string;
  goalSpeechError: string | null;
  angryWarningMessage: string | null;
  goalCooldownSeconds: number;
  onChangeGoalCooldown: (sec: number) => void;
  goalCooldownRemainingMs: number;
  angryCooldownSeconds: number;
  onChangeAngryCooldown: (sec: number) => void;
  angryCooldownRemainingMs: number;
  angryNonVideoDurationSeconds: number;
  onChangeAngryNonVideoDuration: (sec: number) => void;
  availableMics: AudioInputDeviceInfo[];
  selectedGoalMicId: string;
  onSelectGoalMic: (micId: string) => void;
  onRefreshMics: () => void;
  voskModelStatus: 'checking' | 'bundled' | 'indexeddb' | 'missing';
  voskModelFileName: string | null;
  onImportVoskModel: (file: File) => void;
  onRemoveVoskModel: () => void;
  hasMouthASlot: boolean;
  onTestGoalTrigger: () => void;
  hasAngryReactionSlot: boolean;
  onTestAngryTrigger: () => void;

  // Layout Lock & Clean Output Actions
  isLayoutLocked: boolean;
  onToggleLayoutLock: () => void;
  onOpenPopoutWindow: () => void;
  onToggleFullscreen: () => void;
  onOpenTikTokGuide: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isTracking,
  onToggleTracking,
  availableDevices,
  selectedDeviceId,
  onSelectDevice,
  onRefreshDevices,
  isLoadingMediaPipe,
  initProgress,
  cameraError,
  onRetryCamera,
  onStartSimulation,
  webcamStream = null,
  isFaceDetected = false,
  characters,
  activeCharacterId,
  onSelectCharacter,
  onOpenCharacterModal,
  avatarMediaUrlMap = {},
  settings,
  onUpdateSettings,
  onResetSettings,
  liveMode,
  onSetLiveMode,
  aspectRatio,
  onSetAspectRatio,
  backgroundMode,
  onSetBackgroundMode,
  scenographySettings,
  onUpdateScenographySettings,
  stadiumBgSettings,
  onSelectStadiumPreset,
  onUpdateStadiumBgSettings,
  onResetStadiumBgSettings,
  onUploadStadiumImage,
  onUploadStadiumVideo,
  onRemoveStadiumCustomImage,
  onRemoveStadiumCustomVideo,
  hasCustomStadiumImage,
  hasCustomStadiumVideo,
  dualSettings,
  onUpdateDualSettings,
  goalVoiceEnabled,
  onToggleGoalVoice,
  goalActive,
  angryVoiceEnabled,
  onToggleAngryVoice,
  angryActive,
  queuedReactionType,
  goalSpeechStatus,
  goalEnginePreference,
  goalResolvedEngine,
  isElectronEnv,
  onChangeGoalEngine,
  goalSpeechSupported,
  goalLastTranscript,
  detectedCommandLabel,
  goalLastEvent,
  goalSpeechError,
  angryWarningMessage,
  goalCooldownSeconds,
  onChangeGoalCooldown,
  goalCooldownRemainingMs,
  angryCooldownSeconds,
  onChangeAngryCooldown,
  angryCooldownRemainingMs,
  angryNonVideoDurationSeconds,
  onChangeAngryNonVideoDuration,
  availableMics,
  selectedGoalMicId,
  onSelectGoalMic,
  onRefreshMics,
  voskModelStatus,
  voskModelFileName,
  onImportVoskModel,
  onRemoveVoskModel,
  hasMouthASlot,
  onTestGoalTrigger,
  hasAngryReactionSlot,
  onTestAngryTrigger,
  isLayoutLocked,
  onToggleLayoutLock,
  onOpenPopoutWindow,
  onToggleFullscreen,
  onOpenTikTokGuide,
}) => {
  const [showWebcamPreview, setShowWebcamPreview] = React.useState(true);
  const previewVideoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const node = previewVideoRef.current;
    if (!node || !showWebcamPreview) return;
    if (webcamStream) {
      if (node.srcObject !== webcamStream) {
        node.srcObject = webcamStream;
      }
      node.play().catch(() => {});
    } else if (node.srcObject) {
      node.srcObject = null;
    }
  }, [webcamStream, showWebcamPreview]);

  return (
    <div className="w-full flex flex-col gap-5 text-zinc-100">
      
      {/* 1. SEZIONE WEBCAM & TRACKING */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Webcam & Tracking</h3>
              <p className="text-[11px] text-zinc-400">100% elaborazione locale su Windows 11 Chrome</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshDevices}
              title="Aggiorna lista webcam collegate"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleTracking}
              disabled={isLoadingMediaPipe}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all transform active:scale-95 ${
                isTracking
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 ring-2 ring-red-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              {isLoadingMediaPipe ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Inizializzazione...
                </>
              ) : isTracking ? (
                <>
                  <Square className="w-4 h-4 fill-current" /> Ferma Tracking
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Avvia Tracking
                </>
              )}
            </button>
          </div>
        </div>

        {/* Device selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
            <span>Sorgente Webcam</span>
            {availableDevices.some((d) => d.label.toLowerCase().includes('ugreen')) && (
              <span className="text-[10px] text-red-400 font-mono bg-red-950/60 border border-red-800 px-1.5 py-0.5 rounded">
                ★ UGREEN AI Camera rilevata
              </span>
            )}
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => onSelectDevice(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 hover:border-zinc-600 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500 transition"
          >
            {availableDevices.length === 0 ? (
              <option value="">Nessuna telecamera rilevata (richiedi autorizzazione)</option>
            ) : (
              availableDevices.map((dev, idx) => (
                <option key={dev.deviceId || idx} value={dev.deviceId}>
                  {dev.label || `Telecamera ${idx + 1}`}
                  {dev.label.toLowerCase().includes('ugreen') ? ' (UGREEN AI Camera)' : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Anteprima Webcam locale solo per configurazione (separata dall'output LIVE) */}
        <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-300">
                Inquadratura Viso (MediaPipe)
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  isFaceDetected
                    ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300'
                    : 'bg-red-950/80 border-red-500/70 text-red-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isFaceDetected ? 'bg-emerald-400' : 'bg-red-500'
                  }`}
                />
                {isFaceDetected ? 'Viso rilevato' : 'Viso non rilevato'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowWebcamPreview((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-semibold transition"
              title={
                showWebcamPreview
                  ? "Nascondi il riquadro d'anteprima della webcam"
                  : "Mostra il riquadro d'anteprima della webcam"
              }
            >
              {showWebcamPreview ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Nascondi Anteprima</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mostra Anteprima</span>
                </>
              )}
            </button>
          </div>

          {showWebcamPreview && (
            <div className="relative w-full max-w-[280px] mx-auto aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-inner">
              {webcamStream ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center px-3 gap-1.5 text-zinc-500">
                  <Camera className="w-5 h-5 text-zinc-600" />
                  <span className="text-[11px] leading-tight">
                    Avvia il tracking per vedere la webcam e centrare il viso
                  </span>
                </div>
              )}

              {/* Leggera guida ovale per centrare il viso senza coprirlo */}
              <svg
                viewBox="0 0 320 180"
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden="true"
              >
                <ellipse
                  cx="160"
                  cy="88"
                  rx="44"
                  ry="60"
                  fill="none"
                  stroke={isFaceDetected ? 'rgba(52, 211, 153, 0.7)' : 'rgba(255, 255, 255, 0.55)'}
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />
              </svg>

              {/* Stato rilevamento reale sovrapposto in basso */}
              <div className="absolute bottom-1.5 left-1.5 pointer-events-none">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shadow backdrop-blur-sm border ${
                    isFaceDetected
                      ? 'bg-emerald-950/85 border-emerald-500/80 text-emerald-300'
                      : 'bg-red-950/85 border-red-500/80 text-red-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isFaceDetected ? 'bg-emerald-400' : 'bg-red-500'
                    }`}
                  />
                  {isFaceDetected ? 'Viso rilevato' : 'Viso non rilevato'}
                </span>
              </div>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="p-3 bg-red-950/80 border border-red-600/80 rounded-xl text-xs space-y-2 text-red-200 animate-in fade-in">
            <div className="flex items-start gap-1.5 font-bold text-white text-[11px]">
              <span className="text-red-400">⚠️</span>
              <span>Stato Fotocamera:</span>
            </div>
            <p className="text-[11px] text-red-200/90 leading-relaxed">{cameraError}</p>
            <div className="flex items-center gap-2 pt-1">
              {onRetryCamera && (
                <button
                  type="button"
                  onClick={onRetryCamera}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition shadow"
                >
                  Riprova Connessione
                </button>
              )}
              {onStartSimulation && (
                <button
                  type="button"
                  onClick={onStartSimulation}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold transition shadow"
                >
                  Test Simulazione Senza Webcam
                </button>
              )}
            </div>
          </div>
        )}

        {isLoadingMediaPipe && (
          <div className="mt-3 text-[11px] text-red-400 font-mono flex items-center gap-2 bg-red-950/30 border border-red-900/50 p-2 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {initProgress || 'Caricamento modelli MediaPipe...'}
          </div>
        )}
      </div>

      {/* 1B. COMANDI VOCALI LIVE (GOAL & REAZIONE ARRABBIATA SU UN SOLO RICONOSCITORE) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                goalVoiceEnabled || angryVoiceEnabled
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
              }`}
            >
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Comandi Vocali Live
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {goalResolvedEngine === 'vosk' ? 'Vosk Offline' : 'Web Speech'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Un solo riconoscitore condiviso per <strong className="text-zinc-200">GOAL</strong> e{' '}
                <strong className="text-zinc-200">&ldquo;ma vaffanculo&rdquo;</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Stato separato e reale del riconoscimento vocale condiviso */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-950/75 border border-zinc-800/90 rounded-xl px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {(() => {
              const isErrorState =
                goalSpeechStatus === 'model_unavailable' ||
                goalSpeechStatus === 'mic_unavailable' ||
                goalSpeechStatus === 'permission_denied' ||
                goalSpeechStatus === 'unsupported' ||
                goalSpeechStatus === 'error';

              const statusBadge = angryActive
                ? {
                    cls: 'bg-red-600/30 border-red-500 text-red-200 animate-pulse',
                    dot: 'bg-red-400',
                    label: 'REAZIONE ARRABBIATA IN RIPRODUZIONE!',
                  }
                : goalActive
                ? {
                    cls: 'bg-amber-600/30 border-amber-500 text-amber-200 animate-pulse',
                    dot: 'bg-amber-400',
                    label: 'GOAL IN RIPRODUZIONE!',
                  }
                : isErrorState
                ? {
                    cls: 'bg-red-950/80 border-red-500/70 text-red-300',
                    dot: 'bg-red-500',
                    label:
                      goalSpeechStatus === 'model_unavailable'
                        ? 'Modello non disponibile'
                        : goalSpeechStatus === 'mic_unavailable'
                        ? 'Microfono non disponibile'
                        : goalSpeechStatus === 'permission_denied'
                        ? 'Permesso negato'
                        : goalSpeechStatus === 'unsupported'
                        ? 'Motore non supportato'
                        : 'Errore riconoscimento',
                  }
                : goalSpeechStatus === 'loading_model'
                ? {
                    cls: 'bg-amber-950/70 border-amber-500/60 text-amber-300',
                    dot: 'bg-amber-400 animate-pulse',
                    label: 'Caricamento modello offline...',
                  }
                : goalSpeechStatus === 'listening'
                ? {
                    cls: 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300',
                    dot: 'bg-emerald-400 animate-pulse',
                    label: 'In ascolto',
                  }
                : {
                    cls: 'bg-zinc-900 border-zinc-700 text-zinc-400',
                    dot: 'bg-zinc-500',
                    label: 'Disattivo (mic libero)',
                  };

              return (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${statusBadge.cls}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                  {statusBadge.label}
                </span>
              );
            })()}

            {queuedReactionType && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-200">
                In attesa: {queuedReactionType === 'goal' ? 'GOAL' : 'REAZIONE ARRABBIATA'}
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-zinc-400">
            {isElectronEnv ? 'Desktop EXE' : 'Browser'} •{' '}
            {goalResolvedEngine === 'vosk' ? 'Vosk Offline' : 'Web Speech API'}
          </span>
        </div>

        {/* Scheda Comando 1: GOAL con la voce */}
        <div className="p-3 rounded-xl bg-zinc-950/75 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">
                  GOAL con la voce (BOCCA A)
                </span>
                <span className="text-[10px] text-zinc-400 block truncate">
                  Parole: &ldquo;GOL&rdquo;, &ldquo;GOAL&rdquo;, &ldquo;GOOOL&rdquo;
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onTestGoalTrigger}
                disabled={!hasMouthASlot}
                title="Simula il comando vocale GOAL per verificare la riproduzione dall'inizio"
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-amber-300 border border-zinc-700 text-[11px] font-bold transition"
              >
                Test GOAL
              </button>

              <button
                type="button"
                onClick={onToggleGoalVoice}
                disabled={
                  !goalVoiceEnabled &&
                  !angryVoiceEnabled &&
                  goalResolvedEngine === 'webspeech' &&
                  !goalSpeechSupported
                }
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition shadow ${
                  goalVoiceEnabled
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25 ring-1 ring-amber-400'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {goalVoiceEnabled ? 'ATTIVO' : 'DISATTIVO'}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Intervallo minimo GOAL</span>
              <div className="flex items-center gap-1.5">
                {goalCooldownRemainingMs > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/40 text-amber-300">
                    Pausa: {Math.ceil(goalCooldownRemainingMs / 1000)}s
                  </span>
                )}
                <span className="font-mono text-amber-300 font-bold">{goalCooldownSeconds}s</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={goalCooldownSeconds}
              onChange={(e) => onChangeGoalCooldown(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {goalVoiceEnabled && !hasMouthASlot && (
            <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-500/40 text-[10px] text-amber-200">
              Questo personaggio non ha un file caricato nello slot <strong>BOCCA A</strong>.
            </div>
          )}
        </div>

        {/* Scheda Comando 2: REAZIONE ARRABBIATA — “MA VAFFANCULO” */}
        <div className="p-3 rounded-xl bg-zinc-950/75 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Flame className="w-4 h-4 text-red-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">
                  Reazione Arrabbiata
                </span>
                <span className="text-[10px] text-zinc-400 block truncate">
                  Frase esatta: &ldquo;ma vaffanculo&rdquo;
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onTestAngryTrigger}
                title='Simula la frase "ma vaffanculo" per verificare la reazione arrabbiata'
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-red-300 border border-zinc-700 text-[11px] font-bold transition"
              >
                Test reazione arrabbiata
              </button>

              <button
                type="button"
                onClick={onToggleAngryVoice}
                disabled={
                  !angryVoiceEnabled &&
                  !goalVoiceEnabled &&
                  goalResolvedEngine === 'webspeech' &&
                  !goalSpeechSupported
                }
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition shadow ${
                  angryVoiceEnabled
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/25 ring-1 ring-red-400'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {angryVoiceEnabled ? 'ATTIVO' : 'DISATTIVO'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Intervallo minimo</span>
                <div className="flex items-center gap-1.5">
                  {angryCooldownRemainingMs > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/60 border border-red-600/40 text-red-300">
                      Pausa: {Math.ceil(angryCooldownRemainingMs / 1000)}s
                    </span>
                  )}
                  <span className="font-mono text-red-300 font-bold">{angryCooldownSeconds}s</span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={angryCooldownSeconds}
                onChange={(e) => onChangeAngryCooldown(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Durata se PNG / GIF</span>
                <span className="font-mono text-zinc-200 font-bold">
                  {angryNonVideoDurationSeconds}s
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={angryNonVideoDurationSeconds}
                onChange={(e) => onChangeAngryNonVideoDuration(Number(e.target.value))}
                className="w-full accent-zinc-400 cursor-pointer"
              />
            </div>
          </div>

          {!hasAngryReactionSlot && (
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">
              Slot facoltativo <strong className="text-zinc-200">REAZIONE ARRABBIATA — &ldquo;MA VAFFANCULO&rdquo;</strong> non caricato su questo personaggio (aggiungilo in <strong>Gestisci / Carica PNG</strong>).
            </div>
          )}

          {angryWarningMessage && (
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-[11px] text-amber-200">
              {angryWarningMessage}
            </div>
          )}
        </div>

        {/* Motore di riconoscimento vocale condiviso */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-300 block">
            Motore Riconoscimento Vocale (Condiviso)
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'auto', label: 'Auto' },
                { id: 'webspeech', label: 'Browser (Chrome)' },
                { id: 'vosk', label: 'Offline (Vosk EXE)' },
              ] as { id: GoalEnginePreference; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeGoalEngine(opt.id)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition ${
                  goalEnginePreference === opt.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scelta Microfono (condiviso, senza bloccare TikTok LIVE Studio) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-zinc-300">
              Microfono Condiviso (GOAL &amp; Reazione Arrabbiata)
            </label>
            <button
              type="button"
              onClick={onRefreshMics}
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
              title="Aggiorna elenco microfoni"
            >
              <RefreshCw className="w-3 h-3" /> Aggiorna
            </button>
          </div>
          <select
            value={selectedGoalMicId}
            onChange={(e) => onSelectGoalMic(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 hover:border-zinc-600 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 transition"
          >
            <option value="">Predefinito di sistema (Windows / Browser)</option>
            {availableMics.map((mic, idx) => (
              <option key={mic.deviceId || idx} value={mic.deviceId}>
                {mic.label}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-zinc-400 flex flex-col gap-0.5">
            <span>
              Dispositivo in uso:{' '}
              <strong className="text-zinc-200">
                {goalResolvedEngine === 'webspeech'
                  ? 'Microfono predefinito di Chrome (Web Speech)'
                  : availableMics.find((m) => m.deviceId === selectedGoalMicId)?.label ||
                    'Predefinito di sistema'}
              </strong>
            </span>
            <span className="text-zinc-500">
              Un solo ascolto condiviso e muto negli altoparlanti: non interrompe TikTok LIVE Studio.
            </span>
          </div>
        </div>

        {/* Modello Offline Vosk (.tar.gz) */}
        {(goalResolvedEngine === 'vosk' || isElectronEnv) && (
          <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-300">Modello Italiano Vosk Offline</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  voskModelStatus === 'checking'
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    : voskModelStatus === 'missing'
                    ? 'bg-red-950/60 border-red-500/40 text-red-300'
                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                }`}
              >
                {voskModelStatus === 'checking'
                  ? 'Verifica...'
                  : voskModelStatus === 'bundled'
                  ? 'Trovato in models/'
                  : voskModelStatus === 'indexeddb'
                  ? `Importato (${voskModelFileName || 'custom.tar.gz'})`
                  : 'Non trovato'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-semibold cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Importa modello (.tar.gz)</span>
                <input
                  type="file"
                  accept=".tar.gz,.tgz,application/gzip,application/x-gzip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImportVoskModel(file);
                    e.target.value = '';
                  }}
                />
              </label>

              {voskModelStatus === 'indexeddb' && (
                <button
                  type="button"
                  onClick={onRemoveVoskModel}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-800 text-[11px] transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Rimuovi importato
                </button>
              )}
            </div>

            {voskModelStatus === 'missing' && (
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Per l&apos;uso offline in Electron EXE scarica{' '}
                <code className="text-amber-300">vosk-model-small-it-0.22</code>, convertilo in{' '}
                <code className="text-amber-300">vosk-model-small-it-0.22.tar.gz</code> e copialo in{' '}
                <code className="text-zinc-200">public/models/</code> (oppure importalo qui sopra).
              </p>
            )}
          </div>
        )}

        {/* Area testo riconosciuto / comando rilevato solo nel pannello di controllo */}
        {(goalLastTranscript || detectedCommandLabel || goalLastEvent) && (
          <div className="text-[11px] rounded-xl px-3 py-2 bg-zinc-950/90 border border-zinc-800 space-y-1">
            {goalLastTranscript && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500">Testo riconosciuto:</span>
                <span className="font-mono text-zinc-200 truncate max-w-[220px]" title={goalLastTranscript}>
                  &ldquo;{goalLastTranscript}&rdquo;
                </span>
              </div>
            )}
            {detectedCommandLabel && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500">Comando rilevato:</span>
                <span className="font-mono text-emerald-300 font-bold truncate max-w-[220px]" title={detectedCommandLabel}>
                  {detectedCommandLabel}
                </span>
              </div>
            )}
            {goalLastEvent && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500">Stato esecuzione:</span>
                <span className="font-mono text-amber-300 truncate max-w-[220px]" title={goalLastEvent}>
                  {goalLastEvent}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="text-[10px] rounded-xl px-3 py-2 bg-zinc-950/60 border border-zinc-800/80 text-zinc-400 leading-relaxed">
          {goalVoiceEnabled ? (
            <>
              <strong className="text-amber-300">GOAL vocale attivo:</strong> apertura normale della
              bocca e vocali non attivano BOCCA A. <strong className="text-zinc-200">SILENT</strong> e{' '}
              <strong className="text-zinc-200">SPEAKING</strong> continuano a seguire la webcam.
            </>
          ) : (
            <>
              GOAL vocale disattivato: <strong className="text-zinc-200">BOCCA A</strong> segue
              normalmente l&apos;apertura ampia della bocca dalla webcam.
            </>
          )}
        </div>

        {goalSpeechError && (
          <div className="p-2.5 rounded-xl bg-red-950/75 border border-red-500/70 text-[11px] text-red-200 leading-relaxed">
            {goalSpeechError}
          </div>
        )}
      </div>

      {/* 2. SEZIONE PERSONAGGIO ATTIVO */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Personaggio Cartoon</h3>
              <p className="text-[11px] text-zinc-400">Seleziona Goku o i personaggi con immagini PNG</p>
            </div>
          </div>

          <button
            onClick={onOpenCharacterModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-700 transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-red-400" /> Gestisci / Carica PNG
          </button>
        </div>

        {/* Character cards selector */}
        <div className="grid grid-cols-2 gap-2.5">
          {characters.map((char) => {
            const isSelected = char.id === activeCharacterId;
            const resolved = resolveCharacterMediaUrls(char, avatarMediaUrlMap);
            const thumbSlot: CharacterSlotKey =
              (['silent', 'speaking', ...CHARACTER_SLOTS] as CharacterSlotKey[]).find((slot) =>
                Boolean(resolved[slot] || char.images?.[slot])
              ) || 'silent';
            const thumbSrc = resolved[thumbSlot] || char.images?.[thumbSlot] || '';
            const thumbType = inferMediaType(char, thumbSlot, thumbSrc);

            return (
              <div
                key={char.id}
                onClick={() => onSelectCharacter(char.id)}
                className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-red-950/40 border-red-500 ring-1 ring-red-500/50'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="w-12 h-12 bg-black rounded-lg border border-zinc-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                  {thumbSrc && thumbType === 'video' ? (
                    <video
                      src={thumbSrc}
                      muted
                      loop
                      autoPlay
                      playsInline
                      disablePictureInPicture
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={char.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <User className="w-5 h-5 text-zinc-600" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <span className={`text-xs font-bold block truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                    {char.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 block truncate">
                    {char.isPreset ? 'Preset Ufficiale' : 'Personalizzato'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. MODALITÀ DI TRASMISSIONE & OUTPUT TIKTOK */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Regia & TikTok LIVE</h3>
              <p className="text-[11px] text-zinc-400">Layout, sfondo chroma key e scenografia</p>
            </div>
          </div>

          <button
            onClick={onOpenTikTokGuide}
            className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-medium"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Guida TikTok Studio
          </button>
        </div>

        {/* 3 Mode Buttons: Solo Avatar vs Doppio Conduttore vs Solo Scenografia */}
        <fieldset disabled={isLayoutLocked} className="space-y-4 disabled:opacity-55">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onSetLiveMode('solo')}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold uppercase transition text-center ${
                liveMode === 'solo'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="text-[11px]">Solo Avatar</span>
            </button>
            <button
              type="button"
              onClick={() => onSetLiveMode('dual')}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold uppercase transition text-center ${
                liveMode === 'dual'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[11px]">Doppio Cond.</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSetLiveMode('scenography');
                if (stadiumBgSettings.preset !== 'none') {
                  onSetBackgroundMode('stadium');
                } else {
                  onSetBackgroundMode('scenography');
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold uppercase transition text-center ${
                liveMode === 'scenography'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Cattura solo lo sfondo scelto come sorgente in TikTok LIVE Studio"
            >
              <Film className="w-4 h-4 text-red-400" />
              <span className="text-[11px]">Solo Sfondo</span>
            </button>
          </div>

          {/* If Dual Host, show specific Dual options */}
          {liveMode === 'dual' && (
            <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Larghezza Webcam Reale</span>
                <span className="font-mono text-red-400 font-bold">{dualSettings.webcamWidthPercent}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="60"
                step="5"
                value={dualSettings.webcamWidthPercent}
                onChange={(e) => onUpdateDualSettings({ webcamWidthPercent: Number(e.target.value) })}
                className="w-full accent-red-600 cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Nome Telecronista</label>
                  <input
                    type="text"
                    value={dualSettings.webcamLabel}
                    onChange={(e) => onUpdateDualSettings({ webcamLabel: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Nome Avatar</label>
                  <input
                    type="text"
                    value={dualSettings.avatarLabel}
                    onChange={(e) => onUpdateDualSettings({ avatarLabel: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aspect Ratio & Background */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Formato Schermo</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSetAspectRatio('9:16')}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    aspectRatio === '9:16'
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  9:16 (TikTok)
                </button>
                <button
                  type="button"
                  onClick={() => onSetAspectRatio('16:9')}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    aspectRatio === '16:9'
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  16:9 (Orizz.)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Sfondo Live</label>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (stadiumBgSettings.preset === 'none') {
                      onSelectStadiumPreset('stadio_reale');
                    } else {
                      onSetBackgroundMode('stadium');
                    }
                  }}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-0.5 ${
                    backgroundMode === 'stadium' && stadiumBgSettings.preset !== 'none'
                      ? 'bg-red-600 text-white ring-2 ring-red-400'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                  title="Sfondo Stadio Realistico (Foto / Video)"
                >
                  <ImageIcon className="w-3 h-3 text-emerald-400" /> Stadio
                </button>
                <button
                  type="button"
                  onClick={() => onSetBackgroundMode('scenography')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-0.5 ${
                    backgroundMode === 'scenography'
                      ? 'bg-red-600 text-white ring-2 ring-red-400'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                  title="Scenografia Animata Stadio Rossonero 9:16"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" /> Studio
                </button>
                <button
                  type="button"
                  onClick={() => onSetBackgroundMode('green')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-0.5 ${
                    backgroundMode === 'green'
                      ? 'bg-[#00FF00] text-black ring-2 ring-white font-extrabold'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                  title="Sfondo Verde Puro per Chroma Key su TikTok LIVE Studio"
                >
                  <Palette className="w-3 h-3" /> Chroma
                </button>
                <button
                  type="button"
                  onClick={() => onSetBackgroundMode('dark')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition ${
                    backgroundMode === 'dark'
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Nero
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Layout Output Lock Status Banner */}
        {isLayoutLocked && (
          <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/60 text-amber-200 text-[11px] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Layout Output bloccato: formato, scala, posizione, sfondo e composizione sono fissi. Le espressioni facciali restano attive.
            </span>
          </div>
        )}

        {/* Action Buttons: Clean Popout Window, Fullscreen & BLOCCA / SBLOCCA LAYOUT */}
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenPopoutWindow}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 transition transform active:scale-95"
            >
              <ExternalLink className="w-4 h-4" /> Finestra Pulita Output
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              title="Nascondi tutti i pannelli e cattura direttamente Chrome (premi ESC o CTRL + SHIFT + L per uscire)"
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider transition"
            >
              <Maximize2 className="w-4 h-4 text-red-400" /> Modalità Live
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleLayoutLock}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition transform active:scale-95 ${
              isLayoutLocked
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-600/25'
                : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
            }`}
          >
            {isLayoutLocked ? (
              <>
                <Unlock className="w-4 h-4" /> SBLOCCA LAYOUT
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-400" /> BLOCCA LAYOUT OUTPUT
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3B. NUOVA SEZIONE: SFONDO STADIO (FOTOREALISTICO / PERSONALIZZATO) */}
      <div className="bg-zinc-900/90 border border-red-900/50 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  SFONDO STADIO
                </h3>
                {backgroundMode === 'stadium' && stadiumBgSettings.preset !== 'none' && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
                    ATTIVO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Stadio reale o studio dietro l'avatar con regolazione leggibilità
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isLayoutLocked}
            onClick={onResetStadiumBgSettings}
            className="text-[11px] text-zinc-400 hover:text-white transition disabled:opacity-40"
          >
            Ripristina
          </button>
        </div>

        <fieldset disabled={isLayoutLocked} className="space-y-4 disabled:opacity-55">

        {/* Selettore Preset Principale */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
            Selettore Sfondo Stadio
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => onSelectStadiumPreset('none')}
              className={`p-2 rounded-xl border transition flex flex-col items-center justify-center gap-1 text-center ${
                stadiumBgSettings.preset === 'none' || backgroundMode !== 'stadium'
                  ? 'bg-zinc-800/90 border-zinc-500 text-white ring-1 ring-zinc-500/50'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                OFF
              </div>
              <span className="text-[10px] font-bold leading-tight">Nessuno</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectStadiumPreset('studio_rossonero')}
              className={`p-2 rounded-xl border transition flex flex-col items-center justify-center gap-1 text-center ${
                backgroundMode === 'stadium' && stadiumBgSettings.preset === 'studio_rossonero'
                  ? 'bg-red-950/60 border-red-500 text-white shadow-lg shadow-red-600/20 ring-1 ring-red-500'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div className="w-full h-9 rounded-md overflow-hidden border border-zinc-800 bg-black">
                <img
                  src={STADIUM_ASSETS.studioRossonero}
                  alt="Studio Rossonero"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] font-bold leading-tight">Studio Rossonero</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectStadiumPreset('stadio_reale')}
              className={`p-2 rounded-xl border transition flex flex-col items-center justify-center gap-1 text-center ${
                backgroundMode === 'stadium' && stadiumBgSettings.preset === 'stadio_reale'
                  ? 'bg-red-950/60 border-red-500 text-white shadow-lg shadow-red-600/20 ring-1 ring-red-500'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div className="w-full h-9 rounded-md overflow-hidden border border-zinc-800 bg-black">
                <img
                  src={STADIUM_ASSETS.stadiumReal}
                  alt="Stadio Reale"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] font-bold leading-tight">Stadio Reale</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectStadiumPreset('stadio_reale_sfumato')}
              className={`p-2 rounded-xl border transition flex flex-col items-center justify-center gap-1 text-center ${
                backgroundMode === 'stadium' && stadiumBgSettings.preset === 'stadio_reale_sfumato'
                  ? 'bg-red-950/60 border-red-500 text-white shadow-lg shadow-red-600/20 ring-1 ring-red-500'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div className="w-full h-9 rounded-md overflow-hidden border border-zinc-800 bg-black">
                <img
                  src={STADIUM_ASSETS.stadiumReal}
                  alt="Stadio Reale Sfumato"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover blur-[2px] brightness-75 scale-110"
                />
              </div>
              <span className="text-[10px] font-bold leading-tight">Stadio Reale Sfumato</span>
            </button>
          </div>
        </div>

        {/* Caricamento Media Personalizzati (Immagine + Video Opzionale) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Upload Immagine Personalizzata */}
          <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-red-400" /> Immagine Sfondo
              </span>
              {hasCustomStadiumImage && (
                <button
                  type="button"
                  onClick={onRemoveStadiumCustomImage}
                  className="text-zinc-500 hover:text-red-400 transition"
                  title="Rimuovi immagine personalizzata"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition border border-zinc-700">
                <Upload className="w-3 h-3 text-red-400" />
                <span className="truncate">
                  {hasCustomStadiumImage ? 'Cambia Foto' : 'Carica Immagine'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadStadiumImage(file);
                    e.target.value = '';
                  }}
                />
              </label>

              {hasCustomStadiumImage && (
                <button
                  type="button"
                  onClick={() => onSelectStadiumPreset('custom_image')}
                  className={`py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition ${
                    backgroundMode === 'stadium' && stadiumBgSettings.preset === 'custom_image'
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Usa
                </button>
              )}
            </div>

            {stadiumBgSettings.customImageName && hasCustomStadiumImage && (
              <p className="text-[10px] text-zinc-500 truncate font-mono">
                {stadiumBgSettings.customImageName}
              </p>
            )}
          </div>

          {/* Upload Video Personalizzato (Opzionale) */}
          <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                <VideoIcon className="w-3.5 h-3.5 text-amber-400" /> Video Sfondo (Opz.)
              </span>
              {hasCustomStadiumVideo && (
                <button
                  type="button"
                  onClick={onRemoveStadiumCustomVideo}
                  className="text-zinc-500 hover:text-red-400 transition"
                  title="Rimuovi video personalizzato"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition border border-zinc-700">
                <Upload className="w-3 h-3 text-amber-400" />
                <span className="truncate">
                  {hasCustomStadiumVideo ? 'Cambia Video' : 'Carica Video'}
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadStadiumVideo(file);
                    e.target.value = '';
                  }}
                />
              </label>

              {hasCustomStadiumVideo && (
                <button
                  type="button"
                  onClick={() => onSelectStadiumPreset('custom_video')}
                  className={`py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition ${
                    backgroundMode === 'stadium' && stadiumBgSettings.preset === 'custom_video'
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Usa
                </button>
              )}
            </div>

            {stadiumBgSettings.customVideoName && hasCustomStadiumVideo && (
              <p className="text-[10px] text-zinc-500 truncate font-mono">
                {stadiumBgSettings.customVideoName}
              </p>
            )}
          </div>
        </div>

        {/* 4 Slider di Regolazione Sfondo Stadio */}
        <div className="space-y-3 pt-1">
          {/* Opacità Sfondo */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-red-400" /> Opacità Sfondo
              </span>
              <span className="font-mono text-red-400 font-bold">
                {Math.round(stadiumBgSettings.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="1.00"
              step="0.05"
              value={stadiumBgSettings.opacity}
              onChange={(e) =>
                onUpdateStadiumBgSettings({ opacity: Number(e.target.value) })
              }
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Blur Sfondo */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Blur Sfondo
              </span>
              <span className="font-mono text-red-400 font-bold">
                {stadiumBgSettings.preset === 'stadio_reale_sfumato'
                  ? `${6 + stadiumBgSettings.blur} px`
                  : `${stadiumBgSettings.blur} px`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="1"
              value={stadiumBgSettings.blur}
              onChange={(e) =>
                onUpdateStadiumBgSettings({ blur: Number(e.target.value) })
              }
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Luminosità Sfondo */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Luminosità Sfondo
              </span>
              <span className="font-mono text-red-400 font-bold">
                {Math.round(stadiumBgSettings.brightness * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.20"
              max="1.50"
              step="0.05"
              value={stadiumBgSettings.brightness}
              onChange={(e) =>
                onUpdateStadiumBgSettings({ brightness: Number(e.target.value) })
              }
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Scurimento Overlay */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Contrast className="w-3.5 h-3.5 text-zinc-400" /> Scurimento Overlay (Leggibilità)
              </span>
              <span className="font-mono text-red-400 font-bold">
                {Math.round(stadiumBgSettings.overlayDarkness * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.85"
              step="0.05"
              value={stadiumBgSettings.overlayDarkness}
              onChange={(e) =>
                onUpdateStadiumBgSettings({ overlayDarkness: Number(e.target.value) })
              }
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>
        </div>
        </fieldset>
      </div>

      {/* 4. SEZIONE: SCENOGRAFIA LIVE ANIMATA (9:16 ROSSONERA) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Scenografia Live Animata (9:16)
                </h3>
                {backgroundMode === 'scenography' && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-600/25 border border-red-500/40 text-red-400">
                    ATTIVA
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Stadio San Siro notturno, maxischermo TWINHITS, fari LED e fumo
              </p>
            </div>
          </div>

          {/* Freeze / Disable animations button (0% GPU) */}
          <button
            onClick={() =>
              onUpdateScenographySettings({ isFrozen: !scenographySettings.isFrozen })
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border shrink-0 ${
              scenographySettings.isFrozen
                ? 'bg-amber-600/30 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
            title="Congela tutte le animazioni per portare il carico GPU a 0%"
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            <span>{scenographySettings.isFrozen ? 'Animazioni Ferme' : 'Ferma Animazioni'}</span>
          </button>
        </div>

        {/* Selettore Rapido dei 4 Temi Scenografia */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
              Stile Ambientazione Studio
            </label>
            {backgroundMode !== 'scenography' && (
              <button
                type="button"
                disabled={isLayoutLocked}
                onClick={() => onSetBackgroundMode('scenography')}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 underline disabled:opacity-40"
              >
                Attiva Scenografia Studio
              </button>
            )}
          </div>
          <fieldset disabled={isLayoutLocked} className="disabled:opacity-55">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onUpdateScenographySettings({ theme: 'san_siro_twinhits' });
                onSetBackgroundMode('scenography');
              }}
              className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center gap-1 ${
                (scenographySettings.theme || 'san_siro_twinhits') === 'san_siro_twinhits'
                  ? 'bg-red-950/75 border-red-500 text-white shadow-lg shadow-red-600/25 ring-1 ring-red-500'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold leading-tight">Stadio TwinHits</span>
              <span className="text-[9px] text-zinc-400">San Siro 9:16</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdateScenographySettings({ theme: 'studio_led' });
                onSetBackgroundMode('scenography');
              }}
              className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center gap-1 ${
                scenographySettings.theme === 'studio_led'
                  ? 'bg-red-950/60 border-red-500 text-white shadow-lg shadow-red-600/20 ring-1 ring-red-500'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-bold leading-tight">Studio LED</span>
              <span className="text-[9px] text-zinc-500">Talk Show</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdateScenographySettings({ theme: 'stadium_future' });
                onSetBackgroundMode('scenography');
              }}
              className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center gap-1 ${
                scenographySettings.theme === 'stadium_future'
                  ? 'bg-red-950/60 border-red-500 text-white shadow-lg shadow-red-600/20 ring-1 ring-red-500'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold leading-tight">Stadio Futuro</span>
              <span className="text-[9px] text-zinc-500">Live Reaction</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdateScenographySettings({ theme: 'energy_arena' });
                onSetBackgroundMode('scenography');
              }}
              className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center gap-1 ${
                scenographySettings.theme === 'energy_arena'
                  ? 'bg-red-950/60 border-red-500 text-white shadow-lg shadow-red-600/20 ring-1 ring-red-500'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] font-bold leading-tight">Arena Energia</span>
              <span className="text-[9px] text-zinc-500">Goku / eSports</span>
            </button>
          </div>
          </fieldset>
        </div>

        <div className="space-y-3.5 pt-1">
          {/* Slider 1: Intensità Effetti e Movimento */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-red-400" /> Intensità Effetti e Movimento
              </span>
              <span className="font-mono text-red-400 font-bold">
                {Math.round(scenographySettings.motionIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.5"
              step="0.05"
              value={scenographySettings.motionIntensity}
              disabled={scenographySettings.isFrozen}
              onChange={(e) =>
                onUpdateScenographySettings({ motionIntensity: Number(e.target.value) })
              }
              className="w-full accent-red-600 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Slider 2: Luminosità Scenografia */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Luminosità Scenografia e Fari
              </span>
              <span className="font-mono text-red-400 font-bold">
                {Math.round(scenographySettings.brightness * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.05"
              value={scenographySettings.brightness}
              onChange={(e) =>
                onUpdateScenographySettings({ brightness: Number(e.target.value) })
              }
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Slider 3: Quantità Fumo Scenografico Rossonero */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-500" /> Fumo Scenografico Rossonero
              </span>
              <span className="font-mono text-red-400 font-bold">
                {Math.round(scenographySettings.smokeIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={scenographySettings.smokeIntensity}
              onChange={(e) =>
                onUpdateScenographySettings({ smokeIntensity: Number(e.target.value) })
              }
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Slider 4: Velocità Animazione */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300">Velocità Movimento</span>
              <span className="font-mono text-red-400 font-bold">
                {scenographySettings.speed.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={scenographySettings.speed}
              disabled={scenographySettings.isFrozen}
              onChange={(e) =>
                onUpdateScenographySettings({ speed: Number(e.target.value) })
              }
              className="w-full accent-red-600 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* LED Board Ribbon Text Input */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-zinc-300">Testo Ribbon LED Stadio</label>
              <button
                type="button"
                onClick={() =>
                  onUpdateScenographySettings({ showLedBoard: !scenographySettings.showLedBoard })
                }
                className="text-[10px] text-red-400 hover:text-red-300 font-mono"
              >
                {scenographySettings.showLedBoard ? 'Disattiva LED' : 'Attiva LED'}
              </button>
            </div>
            <input
              type="text"
              value={scenographySettings.ledText}
              onChange={(e) => onUpdateScenographySettings({ ledText: e.target.value })}
              placeholder="TWINHITS LIVE • TELECRONACA ROSSONERA..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 5. SLIDER DI REGOLAZIONE AVANZATA AVATAR */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Regolazione Sensibilità</h3>
              <p className="text-[11px] text-zinc-400">Calibrazione movimenti, bocca e fluidità</p>
            </div>
          </div>

          <button
            onClick={onResetSettings}
            className="text-[11px] text-zinc-400 hover:text-white transition"
          >
            Ripristina Default
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Slider 1: Sensibilità Bocca */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300">Sensibilità Apertura Bocca</span>
              <span className="font-mono text-red-400 font-bold">
                {Math.round(settings.mouthSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.06"
              max="0.45"
              step="0.01"
              value={settings.mouthSensitivity}
              onChange={(e) => onUpdateSettings({ mouthSensitivity: Number(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Slider 2: Smoothing */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300">Smoothing (Fluidità)</span>
              <span className="font-mono text-red-400 font-bold">
                {Math.round(settings.smoothing * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={settings.smoothing}
              onChange={(e) => onUpdateSettings({ smoothing: Number(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Slider 3: Intensità Movimento Testa */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300">Intensità Movimento Testa (max 8°)</span>
              <span className="font-mono text-red-400 font-bold">
                {Math.round(settings.headIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.5"
              step="0.1"
              value={settings.headIntensity}
              onChange={(e) => onUpdateSettings({ headIntensity: Number(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Slider 4: Ritardo Chiusura Bocca */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300">Ritardo Chiusura Bocca (Hold)</span>
              <span className="font-mono text-red-400 font-bold">{settings.mouthCloseDelay} ms</span>
            </div>
            <input
              type="range"
              min="50"
              max="400"
              step="25"
              value={settings.mouthCloseDelay}
              onChange={(e) => onUpdateSettings({ mouthCloseDelay: Number(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Slider 5: FPS Target (15 - 30) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300">Target FPS (Ottimizzazione senza GPU)</span>
              <span className="font-mono text-red-400 font-bold">{settings.targetFps} FPS</span>
            </div>
            <input
              type="range"
              min="15"
              max="30"
              step="1"
              value={settings.targetFps}
              onChange={(e) => onUpdateSettings({ targetFps: Number(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>

          {/* Slider 6: Dimensione Personaggio */}
          <fieldset disabled={isLayoutLocked} className="space-y-3 disabled:opacity-55">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  Dimensione Personaggio
                  {isLayoutLocked && <Lock className="w-3 h-3 text-amber-400" />}
                </span>
                <span className="font-mono text-red-400 font-bold">
                  {Math.round(settings.characterScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.8"
                step="0.05"
                value={settings.characterScale}
                onChange={(e) => onUpdateSettings({ characterScale: Number(e.target.value) })}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>

            {/* Posizione X & Y */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span>Posizione X</span>
                  <span className="font-mono">{settings.characterPosX}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="1"
                  value={settings.characterPosX}
                  onChange={(e) => onUpdateSettings({ characterPosX: Number(e.target.value) })}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span>Posizione Y</span>
                  <span className="font-mono">{settings.characterPosY}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="1"
                  value={settings.characterPosY}
                  onChange={(e) => onUpdateSettings({ characterPosY: Number(e.target.value) })}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
};
