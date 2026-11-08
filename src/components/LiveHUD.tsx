import React from 'react';
import { FaceData } from '../types/vtuber';
import { Video, Activity, Smile, Gauge, AlertCircle, Compass, RefreshCw, Sparkles, HelpCircle } from 'lucide-react';

interface LiveHUDProps {
  webcamDeviceName: string;
  isTracking: boolean;
  faceData: FaceData;
  realFps: number;
  cameraError: string | null;
  delegateMode: 'GPU' | 'CPU';
  onRetryCamera?: () => void;
  onStartSimulation?: () => void;
  onOpenGuide?: () => void;
}

export const LiveHUD: React.FC<LiveHUDProps> = ({
  webcamDeviceName,
  isTracking,
  faceData,
  realFps,
  cameraError,
  delegateMode,
  onRetryCamera,
  onStartSimulation,
  onOpenGuide,
}) => {
  const isDeviceInUse = cameraError?.toLowerCase().includes('device in use') || 
                        cameraError?.toLowerCase().includes('occupat');

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Error Banner with Interactive Recovery Actions */}
      {cameraError && (
        <div className="p-3.5 bg-red-950/90 border border-red-500 rounded-2xl text-red-100 text-xs flex flex-col gap-3 shadow-xl backdrop-blur-md animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-white text-sm block">
                {isDeviceInUse ? 'Webcam Occupata (Device in Use)' : 'Attenzione Accesso Webcam'}
              </span>
              <p className="text-red-200 mt-0.5 leading-relaxed">{cameraError}</p>
            </div>
          </div>

          {/* Quick Resolution Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-800/60">
            {onRetryCamera && (
              <button
                type="button"
                onClick={onRetryCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-900/50"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Riprova Connessione
              </button>
            )}

            {onStartSimulation && (
              <button
                type="button"
                onClick={onStartSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Avvia Test Simulazione
              </button>
            )}

            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-red-400" /> Guida TikTok LIVE Studio
              </button>
            )}
          </div>

          {isDeviceInUse && (
            <div className="bg-black/40 border border-red-800/40 p-2.5 rounded-xl text-[11px] text-zinc-300 space-y-1">
              <span className="font-bold text-red-300 block">💡 Come risolvere il blocco con TikTok LIVE Studio:</span>
              <p>
                1. Spegni la webcam dentro TikTok LIVE Studio (o cancella la sorgente webcam USB diretta).
              </p>
              <p>
                2. Clicca qui sopra su <strong className="text-white">"Riprova Connessione"</strong> per riprendere il segnale.
              </p>
              <p>
                3. In TikTok LIVE Studio, aggiungi la telecronaca cliccando su <strong className="text-white">+ Aggiungi sorgente &gt; Cattura Finestra</strong> e seleziona la <strong className="text-red-400">Finestra Pulita Output</strong> di TwinHits!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main HUD Bar */}
      <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-md">
        
        {/* 1. Webcam Status */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <Video className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block leading-none">Webcam</span>
            <span className="font-sans font-bold text-zinc-200 truncate max-w-[140px] block">
              {webcamDeviceName || 'Non connessa'}
            </span>
          </div>
        </div>

        {/* 2. Face Recognition Badge */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-zinc-300" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block leading-none">Face Tracking</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  faceData.detected && isTracking
                    ? 'bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse'
                    : 'bg-zinc-600'
                }`}
              />
              <span
                className={`font-bold ${
                  faceData.detected && isTracking ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                {isTracking ? (faceData.detected ? 'VOLTO RICONOSCIUTO' : 'CERCA VOLTO...') : 'IN PAUSA'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Real FPS */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <Gauge className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block leading-none">FPS Reali</span>
            <span
              className={`font-bold ${
                realFps >= 22 ? 'text-emerald-400' : realFps >= 14 ? 'text-amber-400' : 'text-zinc-400'
              }`}
            >
              {realFps} FPS <span className="text-[10px] text-zinc-500 font-normal">({delegateMode})</span>
            </span>
          </div>
        </div>

        {/* 4. Mouth Openness */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <Smile className="w-3.5 h-3.5" />
          </div>
          <div className="w-28">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 leading-none mb-1">
              <span>Bocca</span>
              <span className="font-bold text-red-400">
                {Math.round(faceData.jawOpen * 100)}%
              </span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
              <div
                className="bg-red-500 h-full rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, Math.round(faceData.jawOpen * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* 5. Head Rotation Angles */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block leading-none">Angoli Testa</span>
            <span className="text-[11px] text-zinc-300 font-mono">
              R:{faceData.roll.toFixed(1)}° P:{faceData.pitch.toFixed(1)}°
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
