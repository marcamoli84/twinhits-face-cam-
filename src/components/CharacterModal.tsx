import React, { useState } from 'react';
import { Character, CharacterImages } from '../types/vtuber';
import { X, Upload, Trash2, Check, UserPlus, Image as ImageIcon, Sparkles, RefreshCw } from 'lucide-react';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  activeCharacterId: string;
  onSelectCharacter: (id: string) => void;
  onSaveCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  characters,
  activeCharacterId,
  onSelectCharacter,
  onSaveCharacter,
  onDeleteCharacter,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<CharacterImages>({
    silent: '',
    speaking: '',
    mouthA: '',
    mouthE: '',
    mouthO: '',
    eyesClosed: '',
  });
  const [testSpeaking, setTestSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartNew = () => {
    setEditingId('new_' + Date.now());
    setName('Nuovo Personaggio');
    setDescription('Personaggio personalizzato per telecronache');
    setImages({
      silent: '',
      speaking: '',
      mouthA: '',
      mouthE: '',
      mouthO: '',
      eyesClosed: '',
    });
    setErrorMsg(null);
  };

  const handleStartEdit = (char: Character) => {
    setEditingId(char.id);
    setName(char.name);
    setDescription(char.description || '');
    setImages({ ...char.images });
    setErrorMsg(null);
  };

  const handleFileUpload = (
    key: keyof CharacterImages,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Carica solo file immagine (PNG, WebP, SVG, JPEG). PNG consigliato con trasparenza!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setImages((prev) => ({
        ...prev,
        [key]: base64,
      }));
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('Inserisci un nome per il personaggio.');
      return;
    }
    if (!images.silent) {
      setErrorMsg('Carica almeno l’immagine SILENT (bocca chiusa).');
      return;
    }
    if (!images.speaking) {
      setErrorMsg('Carica almeno l’immagine SPEAKING (bocca aperta).');
      return;
    }

    const isNew = editingId?.startsWith('new_');
    const finalId = isNew ? 'char_' + Date.now() : (editingId || 'char_' + Date.now());

    const updatedChar: Character = {
      id: finalId,
      name: name.trim(),
      description: description.trim(),
      isPreset: false,
      images: { ...images },
      anchorX: 0.5,
      anchorY: 0.85,
    };

    onSaveCharacter(updatedChar);
    onSelectCharacter(updatedChar.id);
    setEditingId(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-red-600/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-zinc-950 via-red-950/40 to-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Gestione Personaggi Cartoon
                <span className="text-xs font-mono font-normal bg-red-600/30 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full">
                  VTUBER PRO
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Crea e seleziona i personaggi con immagini PNG (SILENT, SPEAKING, Fonemi, Blink).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-600/60 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {errorMsg}
            </div>
          )}

          {/* Mode A: Listing Characters */}
          {!editingId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Personaggi Disponibili ({characters.length})
                </span>
                <button
                  onClick={handleStartNew}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 transition transform active:scale-95"
                >
                  <UserPlus className="w-4 h-4" /> Nuovo Personaggio
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {characters.map((char) => {
                  const isActive = char.id === activeCharacterId;
                  return (
                    <div
                      key={char.id}
                      onClick={() => onSelectCharacter(char.id)}
                      className={`group relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-zinc-900 border-red-500 shadow-xl shadow-red-600/20 ring-1 ring-red-500'
                          : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
                      }`}
                    >
                      {/* Active Tag */}
                      {isActive && (
                        <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                          <Check className="w-3 h-3" /> ATTIVO
                        </div>
                      )}

                      {/* Character Preview Thumbnail */}
                      <div className="w-full h-36 bg-zinc-950/80 rounded-lg flex items-center justify-center p-2 border border-zinc-800/80 overflow-hidden mb-3">
                        <img
                          src={char.images.speaking || char.images.silent}
                          alt={char.name}
                          className="max-h-full max-w-full object-contain filter group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Character Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm truncate">{char.name}</h3>
                          {char.isPreset && (
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono">
                              Preset
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {char.description || 'Nessuna descrizione'}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-zinc-800/60">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(char);
                          }}
                          className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium"
                        >
                          Modifica
                        </button>
                        {!char.isPreset && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Sei sicuro di voler eliminare "${char.name}"?`)) {
                                onDeleteCharacter(char.id);
                              }
                            }}
                            className="text-xs p-1 rounded bg-red-950/40 hover:bg-red-900/80 text-red-400 hover:text-red-200"
                            title="Elimina personaggio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode B: Creating / Editing a Character */}
          {editingId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-sm font-semibold uppercase tracking-wider text-red-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Modifica Asset Personaggio
                </span>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  ← Torna alla lista
                </button>
              </div>

              {/* Character Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nome Personaggio *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="es. Telecronista Derby"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Descrizione / Ruolo (Opzionale)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="es. Commentatore sportivo TikTok LIVE"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Upload Slots */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Caricamento Immagini PNG (Trasparenza consigliata, proporzioni originali preservate)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Slot 1: SILENT (Required) */}
                  <ImageUploadCard
                    title="SILENT (Bocca Chiusa)"
                    required
                    description="Immagine quando sei in silenzio"
                    imageSrc={images.silent}
                    onUpload={(e) => handleFileUpload('silent', e)}
                    onClear={() => setImages((p) => ({ ...p, silent: '' }))}
                  />

                  {/* Slot 2: SPEAKING (Required) */}
                  <ImageUploadCard
                    title="SPEAKING (Bocca Aperta)"
                    required
                    description="Immagine quando parli"
                    imageSrc={images.speaking}
                    onUpload={(e) => handleFileUpload('speaking', e)}
                    onClear={() => setImages((p) => ({ ...p, speaking: '' }))}
                  />

                  {/* Slot 3: BLINK (Optional) */}
                  <ImageUploadCard
                    title="OCCHI CHIUSI (Blink)"
                    description="Occhi chiusi quando sbatti le palpebre"
                    imageSrc={images.eyesClosed}
                    onUpload={(e) => handleFileUpload('eyesClosed', e)}
                    onClear={() => setImages((p) => ({ ...p, eyesClosed: '' }))}
                  />

                  {/* Slot 4: Vocale 'A' (Optional) */}
                  <ImageUploadCard
                    title="Bocca 'A' (Grande apertura)"
                    description="Spalancamento o esultanza da gol"
                    imageSrc={images.mouthA}
                    onUpload={(e) => handleFileUpload('mouthA', e)}
                    onClear={() => setImages((p) => ({ ...p, mouthA: '' }))}
                  />

                  {/* Slot 5: Vocale 'E' (Optional) */}
                  <ImageUploadCard
                    title="Bocca 'E' (Sorriso largo)"
                    description="Apertura orizzontale / sorriso"
                    imageSrc={images.mouthE}
                    onUpload={(e) => handleFileUpload('mouthE', e)}
                    onClear={() => setImages((p) => ({ ...p, mouthE: '' }))}
                  />

                  {/* Slot 6: Vocale 'O' (Optional) */}
                  <ImageUploadCard
                    title="Bocca 'O' (Arrotondata)"
                    description="Espressione di stupore / pucker"
                    imageSrc={images.mouthO}
                    onUpload={(e) => handleFileUpload('mouthO', e)}
                    onClear={() => setImages((p) => ({ ...p, mouthO: '' }))}
                  />
                </div>
              </div>

              {/* Test Animation Preview Box */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-black rounded-lg border border-zinc-700 flex items-center justify-center p-1 overflow-hidden">
                    {(testSpeaking ? images.speaking : images.silent) ? (
                      <img
                        src={testSpeaking ? images.speaking || images.silent : images.silent || images.speaking}
                        alt="Test"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-zinc-500 text-center">Nessuna anteprima</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Test Alternanza Rapido</span>
                    <span className="text-[11px] text-zinc-400">
                      Stato attuale: {testSpeaking ? '🗣️ PARLA (Speaking)' : '🤐 SILENZIO (Silent)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTestSpeaking((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Alterna Bocca
                  </button>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 transition transform active:scale-95"
                >
                  Salva Personaggio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ImageUploadCardProps {
  title: string;
  description: string;
  required?: boolean;
  imageSrc?: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const ImageUploadCard: React.FC<ImageUploadCardProps> = ({
  title,
  description,
  required,
  imageSrc,
  onUpload,
  onClear,
}) => {
  return (
    <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-white">
            {title} {required && <span className="text-red-500">*</span>}
          </span>
          {imageSrc && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] text-red-400 hover:text-red-300"
            >
              Rimuovi
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-400 mb-2 leading-tight">{description}</p>
      </div>

      <div className="relative w-full h-28 bg-zinc-950 rounded-lg border border-dashed border-zinc-700 hover:border-red-500/60 transition flex flex-col items-center justify-center p-2 overflow-hidden group">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="max-h-full max-w-full object-contain drop-shadow"
          />
        ) : (
          <div className="flex flex-col items-center text-zinc-500 gap-1 text-center pointer-events-none">
            <Upload className="w-5 h-5 text-zinc-400 group-hover:text-red-400 transition" />
            <span className="text-[10px] font-medium text-zinc-400">Clicca per caricare PNG</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};
