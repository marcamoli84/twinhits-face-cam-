import React, { useState, useEffect, useRef } from 'react';
import {
  AvatarMediaType,
  Character,
  CharacterImages,
  CharacterSlotKey,
  MediaValidationInfo,
} from '../types/vtuber';
import {
  CHARACTER_SLOTS,
  checkBrowserWebMSupport,
  inferMediaType,
  resolveCharacterMediaUrls,
  validateWebMVideoFile,
} from '../utils/avatarMedia';
import { AvatarMediaStack } from './AvatarMediaStack';
import {
  X,
  Upload,
  Trash2,
  Check,
  UserPlus,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle,
  Film,
  CheckCircle2,
} from 'lucide-react';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  activeCharacterId: string;
  onSelectCharacter: (id: string) => void;
  onSaveCharacter: (
    character: Character,
    pendingMediaBlobs?: Partial<Record<CharacterSlotKey, Blob>>
  ) => Promise<void> | void;
  onDeleteCharacter: (id: string) => void;
  avatarMediaUrlMap?: Record<string, string>;
}

const SLOT_LABELS: Record<CharacterSlotKey, string> = {
  silent: 'SILENT (Bocca Chiusa)',
  speaking: 'SPEAKING (Bocca Aperta)',
  eyesClosed: 'BLINK (Occhi Chiusi)',
  mouthA: 'BOCCA A',
  mouthE: 'BOCCA E',
  mouthO: 'BOCCA O',
};

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  characters,
  activeCharacterId,
  onSelectCharacter,
  onSaveCharacter,
  onDeleteCharacter,
  avatarMediaUrlMap = {},
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
  const [mediaTypes, setMediaTypes] = useState<Partial<Record<CharacterSlotKey, AvatarMediaType>>>({});
  const [mediaKeys, setMediaKeys] = useState<Partial<Record<CharacterSlotKey, string>>>({});
  const [mediaChecks, setMediaChecks] = useState<Partial<Record<CharacterSlotKey, MediaValidationInfo>>>({});
  const [pendingBlobs, setPendingBlobs] = useState<Partial<Record<CharacterSlotKey, Blob>>>({});
  const [tempPreviewUrls, setTempPreviewUrls] = useState<Partial<Record<CharacterSlotKey, string>>>({});
  const [slotPlaying, setSlotPlaying] = useState<Partial<Record<CharacterSlotKey, boolean>>>({});
  const [validatingSlot, setValidatingSlot] = useState<CharacterSlotKey | null>(null);

  const [testSlot, setTestSlot] = useState<CharacterSlotKey>('silent');
  const [testAutoCycle, setTestAutoCycle] = useState(false);
  const [testIsPlaying, setTestIsPlaying] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const createdObjectUrlsRef = useRef<string[]>([]);
  const webmSupport = checkBrowserWebMSupport();

  const revokeTempUrls = () => {
    createdObjectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    createdObjectUrlsRef.current = [];
  };

  useEffect(() => {
    if (!isOpen) {
      setTestAutoCycle(false);
    }
    return () => {
      revokeTempUrls();
    };
  }, [isOpen]);

  // Automatic sequence test cycle across all populated slots
  useEffect(() => {
    if (!isOpen || !editingId || !testAutoCycle) return;

    const availableSlots = CHARACTER_SLOTS.filter((slot) =>
      Boolean(tempPreviewUrls[slot] || images[slot] || (mediaKeys[slot] && avatarMediaUrlMap[mediaKeys[slot]!]))
    );
    if (availableSlots.length <= 1) return;

    let idx = Math.max(0, availableSlots.indexOf(testSlot));
    const timer = window.setInterval(() => {
      idx = (idx + 1) % availableSlots.length;
      setTestSlot(availableSlots[idx]);
    }, 650);

    return () => clearInterval(timer);
  }, [isOpen, editingId, testAutoCycle, tempPreviewUrls, images, mediaKeys, avatarMediaUrlMap, testSlot]);

  if (!isOpen) return null;

  const resetEditorMedia = () => {
    revokeTempUrls();
    setPendingBlobs({});
    setTempPreviewUrls({});
    setSlotPlaying({});
    setTestSlot('silent');
    setTestAutoCycle(false);
    setTestIsPlaying(true);
    setErrorMsg(null);
    setWarningMsg(null);
  };

  const handleStartNew = () => {
    resetEditorMedia();
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
    setMediaTypes({});
    setMediaKeys({});
    setMediaChecks({});
  };

  const handleStartEdit = (char: Character) => {
    resetEditorMedia();
    setEditingId(char.id);
    setName(char.name);
    setDescription(char.description || '');
    setImages({ ...char.images });
    setMediaTypes({ ...(char.mediaTypes || {}) });
    setMediaKeys({ ...(char.mediaKeys || {}) });
    setMediaChecks({ ...(char.mediaChecks || {}) });
  };

  const handleClearSlot = (key: CharacterSlotKey) => {
    setImages((p) => ({ ...p, [key]: '' }));
    setMediaTypes((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    setMediaKeys((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    setMediaChecks((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    setPendingBlobs((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    setTempPreviewUrls((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  };

  const getSlotResolvedSrc = (key: CharacterSlotKey): string => {
    if (tempPreviewUrls[key]) return tempPreviewUrls[key] || '';
    const mKey = mediaKeys[key];
    if (mKey && avatarMediaUrlMap[mKey]) return avatarMediaUrlMap[mKey];
    return images[key] || '';
  };

  const getSlotMediaType = (key: CharacterSlotKey): AvatarMediaType => {
    if (mediaTypes[key]) return mediaTypes[key]!;
    const src = getSlotResolvedSrc(key);
    if (src.startsWith('data:video/') || src.toLowerCase().includes('.webm')) return 'video';
    if (src.startsWith('data:image/gif') || src.toLowerCase().includes('.gif')) return 'gif';
    return 'image';
  };

  const handleFileUpload = async (
    key: CharacterSlotKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isWebM = file.type === 'video/webm' || lowerName.endsWith('.webm');
    const isGif = file.type === 'image/gif' || lowerName.endsWith('.gif');
    const isOtherVideo = file.type.startsWith('video/') && !isWebM;

    if (isOtherVideo) {
      setErrorMsg(
        `Formato "${file.type || file.name}" non supportato per trasparenza live. Carica un file WebM (VP8/VP9 con canale Alpha), una GIF animata o un PNG trasparente.`
      );
      return;
    }

    if (!isWebM && !file.type.startsWith('image/')) {
      setErrorMsg(
        'Formato non valido. Carica immagini PNG (consigliato), GIF animate o video WebM con trasparenza.'
      );
      return;
    }

    // 1. Handle WebM video with real browser playback + alpha channel probe
    if (isWebM) {
      setValidatingSlot(key);
      setErrorMsg(null);
      setWarningMsg(null);

      const validation = await validateWebMVideoFile(file);
      setValidatingSlot(null);

      if (!validation.playable) {
        setMediaChecks((prev) => ({ ...prev, [key]: validation }));
        setErrorMsg(
          `[${SLOT_LABELS[key]}] ${validation.message || 'Video WebM non riproducibile dal browser.'}`
        );
        return;
      }

      const objUrl = URL.createObjectURL(file);
      createdObjectUrlsRef.current.push(objUrl);

      setTempPreviewUrls((prev) => ({ ...prev, [key]: objUrl }));
      setPendingBlobs((prev) => ({ ...prev, [key]: file }));
      setImages((prev) => ({ ...prev, [key]: '' })); // stored in IndexedDB instead of base64
      setMediaTypes((prev) => ({ ...prev, [key]: 'video' }));
      setMediaChecks((prev) => ({ ...prev, [key]: validation }));
      setSlotPlaying((prev) => ({ ...prev, [key]: true }));
      setTestSlot(key);
      setTestIsPlaying(true);

      if (validation.transparency === 'opaque') {
        setWarningMsg(
          `[${SLOT_LABELS[key]}] ${validation.message}`
        );
      }
      return;
    }

    // 2. Handle GIF (store large GIFs in IndexedDB blob store; small GIFs as base64)
    if (isGif) {
      if (file.size > 800 * 1024) {
        const objUrl = URL.createObjectURL(file);
        createdObjectUrlsRef.current.push(objUrl);
        setTempPreviewUrls((prev) => ({ ...prev, [key]: objUrl }));
        setPendingBlobs((prev) => ({ ...prev, [key]: file }));
        setImages((prev) => ({ ...prev, [key]: '' }));
      } else {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const base64 = uploadEvent.target?.result as string;
          setImages((prev) => ({ ...prev, [key]: base64 }));
          setPendingBlobs((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setTempPreviewUrls((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setMediaKeys((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        };
        reader.readAsDataURL(file);
      }

      setMediaTypes((prev) => ({ ...prev, [key]: 'gif' }));
      setMediaChecks((prev) => ({
        ...prev,
        [key]: {
          mediaType: 'gif',
          playable: true,
          transparency: 'unknown',
          message: 'GIF animata pronta per la riproduzione in loop.',
        },
      }));
      setSlotPlaying((prev) => ({ ...prev, [key]: true }));
      setTestSlot(key);
      setErrorMsg(null);
      setWarningMsg(null);
      return;
    }

    // 3. Handle static image (PNG, WebP, SVG, JPEG)
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setImages((prev) => ({ ...prev, [key]: base64 }));
      setMediaTypes((prev) => ({ ...prev, [key]: 'image' }));
      setMediaKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setMediaChecks((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setPendingBlobs((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setTempPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setTestSlot(key);
      setErrorMsg(null);
      setWarningMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Inserisci un nome per il personaggio.');
      return;
    }
    const hasSilent = Boolean(getSlotResolvedSrc('silent') || pendingBlobs.silent);
    const hasSpeaking = Boolean(getSlotResolvedSrc('speaking') || pendingBlobs.speaking);

    if (!hasSilent) {
      setErrorMsg('Carica almeno un file (PNG, GIF o WebM) per lo stato SILENT (bocca chiusa).');
      return;
    }
    if (!hasSpeaking) {
      setErrorMsg('Carica almeno un file (PNG, GIF o WebM) per lo stato SPEAKING (bocca aperta).');
      return;
    }

    setIsSaving(true);
    try {
      const isNew = editingId?.startsWith('new_');
      const finalId = isNew ? 'char_' + Date.now() : editingId || 'char_' + Date.now();
      const saveStamp = Date.now();

      // Assign stable IndexedDB mediaKeys for any pending Blobs (WebM or large GIF)
      const nextMediaKeys: Partial<Record<CharacterSlotKey, string>> = { ...mediaKeys };
      for (const slot of CHARACTER_SLOTS) {
        if (pendingBlobs[slot]) {
          nextMediaKeys[slot] = `avatar_${finalId}_${slot}_${saveStamp}`;
        }
      }

      const updatedChar: Character = {
        id: finalId,
        name: name.trim(),
        description: description.trim(),
        isPreset: false,
        images: { ...images },
        mediaTypes: { ...mediaTypes },
        mediaKeys: nextMediaKeys,
        mediaChecks: { ...mediaChecks },
        anchorX: 0.5,
        anchorY: 0.85,
      };

      await onSaveCharacter(updatedChar, pendingBlobs);
      onSelectCharacter(updatedChar.id);
      resetEditorMedia();
      setEditingId(null);
    } catch (err) {
      console.error('Errore salvataggio personaggio:', err);
      setErrorMsg('Errore durante il salvataggio del personaggio. Riprova.');
    } finally {
      setIsSaving(false);
    }
  };

  // Build preview character & resolved URLs for the live test box
  const previewCharacter: Character = {
    id: editingId || 'preview',
    name: name || 'Anteprima',
    images,
    mediaTypes,
    mediaKeys,
  };
  const previewResolvedUrls: Partial<Record<CharacterSlotKey, string>> = {};
  for (const slot of CHARACTER_SLOTS) {
    const resolved = getSlotResolvedSrc(slot);
    if (resolved) {
      previewResolvedUrls[slot] = resolved;
    }
  }

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
                Supporta immagini PNG trasparenti, GIF animate e video WebM con trasparenza (SILENT, SPEAKING, Blink, Vocali).
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetEditorMedia();
              setEditingId(null);
              onClose();
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-950/70 border border-red-600/70 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {warningMsg && (
            <div className="p-3 bg-amber-950/60 border border-amber-500/60 rounded-xl text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{warningMsg}</span>
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
                  const resolved = resolveCharacterMediaUrls(char, avatarMediaUrlMap);
                  const thumbSlot: CharacterSlotKey =
                    (['speaking', 'silent', ...CHARACTER_SLOTS] as CharacterSlotKey[]).find((slot) =>
                      Boolean(resolved[slot] || char.images?.[slot])
                    ) || 'silent';
                  const thumbSrc = resolved[thumbSlot] || char.images?.[thumbSlot] || '';
                  const thumbType = inferMediaType(char, thumbSlot, thumbSrc);
                  const hasVideoSlots = CHARACTER_SLOTS.some(
                    (s) => inferMediaType(char, s, resolved[s]) === 'video'
                  );

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
                        <div className="absolute top-3 right-3 z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                          <Check className="w-3 h-3" /> ATTIVO
                        </div>
                      )}

                      {hasVideoSlots && (
                        <div className="absolute top-3 left-3 z-10 bg-zinc-950/90 border border-red-500/40 text-red-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Film className="w-2.5 h-2.5" /> VIDEO
                        </div>
                      )}

                      {/* Character Preview Thumbnail */}
                      <div className="w-full h-36 bg-zinc-950/80 rounded-lg flex items-center justify-center p-2 border border-zinc-800/80 overflow-hidden mb-3">
                        {thumbSrc && thumbType === 'video' ? (
                          <video
                            src={thumbSrc}
                            muted
                            loop
                            autoPlay
                            playsInline
                            disablePictureInPicture
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                          />
                        ) : thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={char.name}
                            className="max-h-full max-w-full object-contain filter group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-zinc-700" />
                        )}
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
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      webmSupport.supported
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {webmSupport.supported
                      ? 'Browser: WebM VP8/VP9 Alpha OK'
                      : 'Browser: Solo PNG / GIF'}
                  </span>
                  <button
                    onClick={() => {
                      resetEditorMedia();
                      setEditingId(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    ← Torna alla lista
                  </button>
                </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Caricamento Asset (PNG Trasparente • GIF Animata • Video WebM Alpha senza audio)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MediaUploadCard
                    title="SILENT (Bocca Chiusa)"
                    required
                    description="Quando sei in silenzio"
                    mediaSrc={getSlotResolvedSrc('silent')}
                    mediaType={getSlotMediaType('silent')}
                    validation={mediaChecks.silent}
                    isValidating={validatingSlot === 'silent'}
                    isPlaying={slotPlaying.silent ?? true}
                    onTogglePlay={() =>
                      setSlotPlaying((p) => ({ ...p, silent: !(p.silent ?? true) }))
                    }
                    onTestInStage={() => {
                      setTestAutoCycle(false);
                      setTestSlot('silent');
                      setTestIsPlaying(true);
                    }}
                    onUpload={(e) => handleFileUpload('silent', e)}
                    onClear={() => handleClearSlot('silent')}
                  />

                  <MediaUploadCard
                    title="SPEAKING (Bocca Aperta)"
                    required
                    description="Quando parli in telecronaca"
                    mediaSrc={getSlotResolvedSrc('speaking')}
                    mediaType={getSlotMediaType('speaking')}
                    validation={mediaChecks.speaking}
                    isValidating={validatingSlot === 'speaking'}
                    isPlaying={slotPlaying.speaking ?? true}
                    onTogglePlay={() =>
                      setSlotPlaying((p) => ({ ...p, speaking: !(p.speaking ?? true) }))
                    }
                    onTestInStage={() => {
                      setTestAutoCycle(false);
                      setTestSlot('speaking');
                      setTestIsPlaying(true);
                    }}
                    onUpload={(e) => handleFileUpload('speaking', e)}
                    onClear={() => handleClearSlot('speaking')}
                  />

                  <MediaUploadCard
                    title="OCCHI CHIUSI (Blink)"
                    description="Quando sbatti le palpebre"
                    mediaSrc={getSlotResolvedSrc('eyesClosed')}
                    mediaType={getSlotMediaType('eyesClosed')}
                    validation={mediaChecks.eyesClosed}
                    isValidating={validatingSlot === 'eyesClosed'}
                    isPlaying={slotPlaying.eyesClosed ?? true}
                    onTogglePlay={() =>
                      setSlotPlaying((p) => ({ ...p, eyesClosed: !(p.eyesClosed ?? true) }))
                    }
                    onTestInStage={() => {
                      setTestAutoCycle(false);
                      setTestSlot('eyesClosed');
                      setTestIsPlaying(true);
                    }}
                    onUpload={(e) => handleFileUpload('eyesClosed', e)}
                    onClear={() => handleClearSlot('eyesClosed')}
                  />

                  <MediaUploadCard
                    title="Bocca 'A' (Grande apertura)"
                    description="Spalancamento o esultanza da gol"
                    mediaSrc={getSlotResolvedSrc('mouthA')}
                    mediaType={getSlotMediaType('mouthA')}
                    validation={mediaChecks.mouthA}
                    isValidating={validatingSlot === 'mouthA'}
                    isPlaying={slotPlaying.mouthA ?? true}
                    onTogglePlay={() =>
                      setSlotPlaying((p) => ({ ...p, mouthA: !(p.mouthA ?? true) }))
                    }
                    onTestInStage={() => {
                      setTestAutoCycle(false);
                      setTestSlot('mouthA');
                      setTestIsPlaying(true);
                    }}
                    onUpload={(e) => handleFileUpload('mouthA', e)}
                    onClear={() => handleClearSlot('mouthA')}
                  />

                  <MediaUploadCard
                    title="Bocca 'E' (Sorriso largo)"
                    description="Apertura orizzontale / sorriso"
                    mediaSrc={getSlotResolvedSrc('mouthE')}
                    mediaType={getSlotMediaType('mouthE')}
                    validation={mediaChecks.mouthE}
                    isValidating={validatingSlot === 'mouthE'}
                    isPlaying={slotPlaying.mouthE ?? true}
                    onTogglePlay={() =>
                      setSlotPlaying((p) => ({ ...p, mouthE: !(p.mouthE ?? true) }))
                    }
                    onTestInStage={() => {
                      setTestAutoCycle(false);
                      setTestSlot('mouthE');
                      setTestIsPlaying(true);
                    }}
                    onUpload={(e) => handleFileUpload('mouthE', e)}
                    onClear={() => handleClearSlot('mouthE')}
                  />

                  <MediaUploadCard
                    title="Bocca 'O' (Arrotondata)"
                    description="Espressione di stupore / pucker"
                    mediaSrc={getSlotResolvedSrc('mouthO')}
                    mediaType={getSlotMediaType('mouthO')}
                    validation={mediaChecks.mouthO}
                    isValidating={validatingSlot === 'mouthO'}
                    isPlaying={slotPlaying.mouthO ?? true}
                    onTogglePlay={() =>
                      setSlotPlaying((p) => ({ ...p, mouthO: !(p.mouthO ?? true) }))
                    }
                    onTestInStage={() => {
                      setTestAutoCycle(false);
                      setTestSlot('mouthO');
                      setTestIsPlaying(true);
                    }}
                    onUpload={(e) => handleFileUpload('mouthO', e)}
                    onClear={() => handleClearSlot('mouthO')}
                  />
                </div>
              </div>

              {/* Unified Live Test Preview Box */}
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-24 h-24 rounded-lg border border-zinc-700 flex items-center justify-center p-1 overflow-hidden shrink-0"
                      style={{
                        backgroundColor: '#09090B',
                        backgroundImage:
                          'radial-gradient(#27272a 1px, transparent 1px)',
                        backgroundSize: '10px 10px',
                      }}
                    >
                      {Object.keys(previewResolvedUrls).length > 0 ? (
                        <AvatarMediaStack
                          character={previewCharacter}
                          activeSlot={testSlot}
                          resolvedMediaUrls={previewResolvedUrls}
                          isPlaying={testIsPlaying}
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-500 text-center">
                          Nessuna anteprima
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Anteprima e Test Riproduzione Stati Avatar
                      </span>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        Stato selezionato:{' '}
                        <strong className="text-red-400 font-mono">
                          {SLOT_LABELS[testSlot]}
                        </strong>
                      </span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">
                        Verifica allineamento, loop senza audio e trasparenza prima di andare in live.
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTestIsPlaying((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold"
                    >
                      {testIsPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-400" /> Pausa Video
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-400" /> Riproduci
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestAutoCycle((v) => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        testAutoCycle
                          ? 'bg-red-600/30 border-red-500 text-red-200'
                          : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white'
                      }`}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${testAutoCycle ? 'animate-spin' : ''}`}
                      />
                      {testAutoCycle ? 'Ferma Sequenza' : 'Test Sequenza Live'}
                    </button>
                  </div>
                </div>

                {/* Individual State Test Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/80">
                  {CHARACTER_SLOTS.map((slot) => {
                    const hasAsset = Boolean(previewResolvedUrls[slot]);
                    const isSelected = testSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!hasAsset}
                        onClick={() => {
                          setTestAutoCycle(false);
                          setTestSlot(slot);
                          setTestIsPlaying(true);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition ${
                          !hasAsset
                            ? 'bg-zinc-950/40 border-zinc-800/50 text-zinc-600 cursor-not-allowed'
                            : isSelected
                            ? 'bg-red-600 border-red-500 text-white shadow'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {slot === 'eyesClosed'
                          ? 'BLINK'
                          : slot.replace('mouth', 'BOCCA ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    resetEditorMedia();
                    setEditingId(null);
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={isSaving || validatingSlot !== null}
                  onClick={handleSave}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 transition transform active:scale-95"
                >
                  {isSaving ? 'Salvataggio...' : 'Salva Personaggio'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MediaUploadCardProps {
  title: string;
  description: string;
  required?: boolean;
  mediaSrc?: string;
  mediaType: AvatarMediaType;
  validation?: MediaValidationInfo;
  isValidating?: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onTestInStage: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const MediaUploadCard: React.FC<MediaUploadCardProps> = ({
  title,
  description,
  required,
  mediaSrc,
  mediaType,
  validation,
  isValidating,
  isPlaying,
  onTogglePlay,
  onTestInStage,
  onUpload,
  onClear,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || mediaType !== 'video') return;
    el.muted = true;
    el.loop = true;
    if (isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [mediaSrc, mediaType, isPlaying]);

  const isVideo = mediaType === 'video' && Boolean(mediaSrc);
  const isGif = mediaType === 'gif' && Boolean(mediaSrc);

  return (
    <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col justify-between gap-2">
      <div>
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="text-xs font-bold text-white truncate">
            {title} {required && <span className="text-red-500">*</span>}
          </span>
          {mediaSrc && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] text-red-400 hover:text-red-300 shrink-0"
            >
              Rimuovi
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-400 leading-tight">{description}</p>
      </div>

      {/* Preview Box with subtle transparency checkerboard */}
      <div
        className="relative w-full h-28 rounded-lg border border-dashed border-zinc-700 hover:border-red-500/60 transition flex flex-col items-center justify-center p-2 overflow-hidden group"
        style={{
          backgroundColor: '#09090B',
          backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)',
          backgroundSize: '10px 10px',
        }}
      >
        {isValidating ? (
          <div className="flex flex-col items-center gap-1 text-amber-300 text-[10px] font-mono">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Verifica WebM Alpha...</span>
          </div>
        ) : mediaSrc ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={mediaSrc}
              autoPlay={isPlaying}
              loop
              muted
              playsInline
              disablePictureInPicture
              className="max-h-full max-w-full object-contain drop-shadow"
            />
          ) : (
            <img
              src={mediaSrc}
              alt={title}
              className="max-h-full max-w-full object-contain drop-shadow"
            />
          )
        ) : (
          <div className="flex flex-col items-center text-zinc-500 gap-1 text-center pointer-events-none">
            <Upload className="w-5 h-5 text-zinc-400 group-hover:text-red-400 transition" />
            <span className="text-[10px] font-medium text-zinc-400">
              PNG, GIF o WebM Alpha
            </span>
          </div>
        )}

        {/* Format badge top-left */}
        {mediaSrc && !isValidating && (
          <span
            className={`absolute top-1.5 left-1.5 z-10 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border pointer-events-none ${
              isVideo
                ? validation?.transparency === 'opaque'
                  ? 'bg-amber-950/90 border-amber-500/50 text-amber-300'
                  : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : isGif
                ? 'bg-purple-950/90 border-purple-500/50 text-purple-300'
                : 'bg-zinc-900/90 border-zinc-700 text-zinc-300'
            }`}
          >
            {isVideo
              ? validation?.transparency === 'opaque'
                ? 'WEBM OPACO'
                : 'WEBM ALPHA'
              : isGif
              ? 'GIF'
              : 'PNG/IMG'}
          </span>
        )}

        <input
          type="file"
          accept="image/png,image/gif,image/webp,image/svg+xml,image/jpeg,video/webm,.webm"
          onChange={onUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
          title="Clicca per caricare PNG, GIF o video WebM trasparente"
        />
      </div>

      {/* Per-slot playback test & status */}
      {mediaSrc && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            {isVideo ? (
              <button
                type="button"
                onClick={onTogglePlay}
                className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[10px] font-semibold text-zinc-200 transition"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3 h-3 text-amber-400" /> Pausa
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-emerald-400" /> Riproduci
                  </>
                )}
              </button>
            ) : null}

            <button
              type="button"
              onClick={onTestInStage}
              className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md bg-zinc-800 hover:bg-red-950/70 border border-zinc-700 hover:border-red-500/50 text-[10px] font-semibold text-zinc-200 transition"
            >
              <Play className="w-3 h-3 text-red-400" /> Prova Stato
            </button>
          </div>

          {validation && (
            <p
              className={`text-[10px] leading-tight flex items-start gap-1 ${
                !validation.playable
                  ? 'text-red-400'
                  : validation.transparency === 'opaque'
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }`}
            >
              {!validation.playable || validation.transparency === 'opaque' ? (
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />
              )}
              <span>{validation.message}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
