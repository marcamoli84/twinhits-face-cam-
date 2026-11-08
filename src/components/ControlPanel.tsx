import React from 'react';
import {
  TrackingSettings,
  LiveMode,
  AspectRatioMode,
  BackgroundMode,
  DualHostSettings,
  Character,
  ScenographySettings,
} from '../types/vtuber';
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

  // Characters
  characters: Character[];
  activeCharacterId: string;
  onSelectCharacter: (id: string) => void;
  onOpenCharacterModal: () => void;

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

  // Dual Host
  dualSettings: DualHostSettings;
  onUpdateDualSettings: (newSettings: Partial<DualHostSettings>) => void;

  // Clean Output Actions
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
  characters,
  activeCharacterId,
  onSelectCharacter,
  onOpenCharacterModal,
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
  dualSettings,
  onUpdateDualSettings,
  onOpenPopoutWindow,
  onToggleFullscreen,
  onOpenTikTokGuide,
}) => {
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
                  <img
                    src={char.images.silent || char.images.speaking}
                    alt={char.name}
                    className="max-h-full max-w-full object-contain"
                  />
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
        <div className="grid grid-cols-3 gap-1.5">
          <button
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
            onClick={() => {
              onSetLiveMode('scenography');
              onSetBackgroundMode('scenography');
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold uppercase transition text-center ${
              liveMode === 'scenography'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Cattura solo la scenografia animata come sorgente sfondo in TikTok LIVE Studio"
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
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onSetBackgroundMode('scenography')}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                  backgroundMode === 'scenography'
                    ? 'bg-red-600 text-white ring-2 ring-red-400'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
                title="Scenografia Animata Stadio Rossonero 9:16"
              >
                <Sparkles className="w-3 h-3 text-amber-400" /> Scenografia
              </button>
              <button
                onClick={() => onSetBackgroundMode('green')}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                  backgroundMode === 'green'
                    ? 'bg-[#00FF00] text-black ring-2 ring-white font-extrabold'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
                title="Sfondo Verde Puro per Chroma Key su TikTok LIVE Studio"
              >
                <Palette className="w-3 h-3" /> Chroma
              </button>
              <button
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

        {/* Action Buttons: Clean Popout Window & Fullscreen */}
        <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-2">
          <button
            onClick={onOpenPopoutWindow}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 transition transform active:scale-95"
          >
            <ExternalLink className="w-4 h-4" /> Finestra Pulita Output
          </button>
          <button
            onClick={onToggleFullscreen}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider transition"
          >
            <Maximize2 className="w-4 h-4" /> Schermo Intero
          </button>
        </div>
      </div>

      {/* 4. SEZIONE: SCENOGRAFIA LIVE ANIMATA (9:16 ROSSONERA) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Scenografia Live Animata (9:16)
              </h3>
              <p className="text-[11px] text-zinc-400">Stadio Rossonero procedurale, luci LED e fumo</p>
            </div>
          </div>

          {/* Freeze / Disable animations button (0% GPU) */}
          <button
            onClick={() =>
              onUpdateScenographySettings({ isFrozen: !scenographySettings.isFrozen })
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
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

        {/* Selettore Rapido dei 3 Temi Scenografia */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
            Stile Ambientazione Studio
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateScenographySettings({ theme: 'studio_led' })}
              className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center gap-1 ${
                (scenographySettings.theme || 'studio_led') === 'studio_led'
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
              onClick={() => onUpdateScenographySettings({ theme: 'stadium_future' })}
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
              onClick={() => onUpdateScenographySettings({ theme: 'energy_arena' })}
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
        </div>

        <div className="space-y-3.5 pt-1">
          {/* Slider 1: Intensità Movimento */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-red-400" /> Intensità Movimento Luci LED
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

          {/* Slider 2: Luminosità Stadio */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Luminosità Fari e Bagliore
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

          {/* Slider 3: Quantità Fumo Rosso & Nero */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-500" /> Fumo Atmosferico Rosso & Nero
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
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-zinc-300">Dimensione Personaggio</span>
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
        </div>
      </div>
    </div>
  );
};
