import React from 'react';
import { X, Tv, Monitor, CheckCircle2, Sliders, ShieldCheck } from 'lucide-react';

interface TikTokStudioGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPopout: () => void;
}

export const TikTokStudioGuide: React.FC<TikTokStudioGuideProps> = ({
  isOpen,
  onClose,
  onOpenPopout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-red-600/50 rounded-2xl shadow-2xl p-6 text-zinc-100 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Guida TikTok LIVE Studio (Windows 11)
              </h2>
              <p className="text-xs text-zinc-400">
                Come catturare l'avatar con Window Capture senza barre né menu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions Steps */}
        <div className="space-y-4 my-5 text-xs text-zinc-300">
          <div className="flex gap-3 items-start bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              1
            </span>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">
                Apri la Finestra Pulita di Output
              </h4>
              <p className="text-zinc-400 leading-relaxed">
                Clicca su <strong className="text-red-400">"Finestra Pulita Output"</strong> in questa app. Si aprirà una finestra dedicata priva di qualsiasi interfaccia, slider o menu, pronta per la trasmissione.
              </p>
              <button
                type="button"
                onClick={() => {
                  onOpenPopout();
                  onClose();
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-[11px] shadow"
              >
                <Monitor className="w-3.5 h-3.5" /> Apri Ora Finestra Pulita
              </button>
            </div>
          </div>

          <div className="flex gap-3 items-start bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              2
            </span>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">
                In TikTok LIVE Studio: Aggiungi "Cattura Finestra"
              </h4>
              <p className="text-zinc-400 leading-relaxed">
                Nel programma TikTok LIVE Studio su Windows 11, premi <strong className="text-white">+ Aggiungi sorgente</strong> e scegli <strong>"Cattura Finestra" (Window Capture)</strong>.
              </p>
              <p className="text-zinc-400 mt-1">
                Seleziona dall'elenco la finestra del browser: <code className="bg-zinc-950 px-1 py-0.5 rounded text-red-400">TWINHITS FACECAM - LIVE OUTPUT</code>.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              3
            </span>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">
                Sfondo Chroma Key (Verde Puro #00FF00)
              </h4>
              <p className="text-zinc-400 leading-relaxed">
                Se desideri sovrapporre il personaggio sopra al gameplay o alla partita:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-zinc-300">
                <li>Imposta lo sfondo su <strong className="text-green-400">"Verde"</strong> in basso nei controlli.</li>
                <li>In TikTok LIVE Studio, fai clic destro sulla sorgente &gt; <strong>Filtri</strong> &gt; <strong>Chroma Key</strong> (colore Verde).</li>
                <li>Lo sfondo verde sparirà istantaneamente lasciando solo il tuo cartoon!</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 items-start bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              4
            </span>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">
                Formato Verticale 9:16 per TikTok
              </h4>
              <p className="text-zinc-400 leading-relaxed">
                Usa il selettore <strong className="text-white">9:16 (TikTok)</strong> per adattare perfettamente le proporzioni allo schermo verticale (720x1280) degli smartphone dei tuoi spettatori.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start bg-zinc-900/60 p-3.5 rounded-xl border border-red-900/40 bg-red-950/20">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              5
            </span>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">
                Nuova Scenografia Stadio 9:16 Animata & Livelli
              </h4>
              <p className="text-zinc-400 leading-relaxed">
                Puoi impostare <strong className="text-red-400">"Solo Sfondo"</strong> per catturare lo stadio animato rossonero come sorgente di sfondo in TikTok LIVE Studio, e poi aggiungere sopra la tua webcam reale e l'avatar con chroma key verde!
              </p>
            </div>
          </div>
        </div>

        {/* Windows 11 & Device In Use Conflict Prevention */}
        <div className="p-3.5 bg-amber-950/40 border border-amber-600/50 rounded-xl text-xs text-amber-200 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <span className="text-sm">⚠️</span>
            <span>Come evitare l'errore "Device in use" (Webcam Occupata):</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            In Windows 11 le fotocamere USB hanno un blocco esclusivo: se hai già aggiunto la webcam come sorgente diretta dentro <strong>TikTok LIVE Studio</strong>, il browser non potrà aprirla e restituirà l'errore <em>"Device in use"</em>.
          </p>
          <div className="bg-black/30 p-2 rounded-lg text-[11px] text-zinc-300 space-y-0.5 mt-1 border border-amber-800/40">
            <p>✅ <strong>Soluzione:</strong> Chiudi la sorgente fotocamera in TikTok LIVE Studio.</p>
            <p>✅ Avvia il tracking in <strong>TwinHits FaceCam</strong>.</p>
            <p>✅ In TikTok LIVE Studio trasmetti tramite <strong>Cattura Finestra (Finestra Pulita Output)</strong>: vedrai la tua webcam, l'avatar cartoon sincronizzato e la scenografia stadio senza nessun conflitto!</p>
          </div>
        </div>

        {/* Note on Windows Virtual Camera */}
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-zinc-200">Nota tecnica trasparenza:</strong> Questa applicazione web sfrutta il metodo standard e più affidabile (Window Capture in Google Chrome su Windows 11). Non richiede driver kernel invadenti.
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-zinc-800 mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs uppercase"
          >
            Ho Capito
          </button>
        </div>
      </div>
    </div>
  );
};
