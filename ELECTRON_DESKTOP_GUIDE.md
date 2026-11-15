# Guida Integrazione Electron Windows (TWINHITS FACECAM)

> **Nota trasparente sul workspace**: questo repository contiene esclusivamente l'applicazione web React/Vite di Google AI Studio (`src/`, `index.html`, `package.json`, `vite.config.ts`). I file desktop Windows/Electron (`main.js`, `preload.js`, `electron-builder.yml`) non sono presenti in questo ambiente, quindi il nuovo bundle `dist/` va copiato e impacchettato nel tuo progetto Electron esterno su Windows.

---

## 1. Come funziona adesso GOAL con la voce

- **Nel browser Chrome** (`Auto` o `Browser (Chrome)`): continua a usare la **Web Speech API** esistente senza cambiare il comportamento già funzionante.
- **In Electron Windows EXE** (`Auto` o `Offline (Vosk EXE)`): usa **Vosk (`vosk-browser`)** completamente offline in WebAssembly/Web Worker. Non contatta i server Google Speech e non genera più `"Errore di rete del riconoscimento vocale Chrome"`.
- **Microfono condiviso senza eco**: acquisisce il microfono scelto via `getUserMedia` in modalità condivisa e invia l'audio a un `GainNode(0)` mutato, così la tua voce **non esce dagli altoparlanti** e **non blocca TikTok LIVE Studio**.

---

## 2. Preparazione del modello italiano Vosk (`.tar.gz`)

`vosk-browser` legge archivi **`.tar.gz`** (non `.zip` grezzi).

1. Scarica da AlphaCephei il modello italiano leggero (~48 MB):
   `https://alphacephei.com/vosk/models/vosk-model-small-it-0.22.zip`
2. Estrai lo `.zip` in una cartella temporanea (otterrai la cartella `vosk-model-small-it-0.22`).
3. Su Windows 10/11 apri PowerShell dentro la cartella genitore ed esegui:
   ```powershell
   tar -czf vosk-model-small-it-0.22.tar.gz vosk-model-small-it-0.22
   ```
4. Scegli **una** di queste due opzioni:
   - **Opzione A (consigliata per l'EXE pronto all'uso)**: copia `vosk-model-small-it-0.22.tar.gz` in `public/models/vosk-model-small-it-0.22.tar.gz` prima di eseguire `npm run build`. Vite copierà il file automaticamente in `dist/models/vosk-model-small-it-0.22.tar.gz`.
   - **Opzione B (senza ricompilare l'EXE)**: apri l'app e nella sezione **1B. GOAL CON LA VOCE** clicca **Importa modello (.tar.gz)** per salvarlo in locale dentro IndexedDB.

---

## 3. Requisiti nel progetto Electron Windows (`main.js` & `electron-builder`)

### A. Permessi Microfono e Webcam (`main.js`)
Assicurati che il processo principale Electron conceda i permessi `media` (`camera` e `microphone`) per l'origine locale usata dall'app (`http://localhost:3000` o `file://` / server locale):

```js
const { app, BrowserWindow, session } = require('electron');

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media' || permission === 'mediaKeySystem' || permission === 'audioCapture') {
      callback(true);
      return;
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'media' || permission === 'audioCapture') {
      return true;
    }
    return false;
  });
});
```

### B. Inclusione di `dist/models/*.tar.gz` nel build Windows (`electron-builder`)
1. Esegui in questo progetto web:
   ```bash
   npm install
   npm run build
   ```
2. Copia l'intera cartella `dist/` risultante dentro la directory sorgente della tua app Electron (sostituendo la vecchia build web).
3. Nella configurazione `electron-builder` (`package.json` del progetto Electron o `electron-builder.yml`), assicurati che tutti i file dentro `dist/**` — incluso `dist/models/vosk-model-small-it-0.22.tar.gz` — siano inclusi nel pacchetto finale e accessibili tramite URL relativo `./models/vosk-model-small-it-0.22.tar.gz` rispetto a `index.html`.
4. Mantieni titolo finestra `TWINHITS FACECAM`, server/porta `3000` (se il wrapper Electron serve su `localhost:3000`) e finestra pulita `TWINHITS FACECAM - LIVE OUTPUT`.
5. Ricompila il tuo `.exe` Windows con il comando di build del tuo repository Electron (es. `npm run dist` o `electron-builder --win`).

---

## 4. Verifica rapida prima di andare in live

1. Avvia l'EXE e controlla che il nome finestra sia `TWINHITS FACECAM`.
2. Apri la sezione **1B. GOAL CON LA VOCE**, seleziona il microfono desiderato (o lascia il predefinito) e imposta il cooldown (default `5s`).
3. Se vedi stato **Modello non disponibile**, verifica che `dist/models/vosk-model-small-it-0.22.tar.gz` sia presente oppure usa **Importa modello (.tar.gz)**.
4. Attiva **GOAL con la voce** e verifica che lo stato diventi **In ascolto (Vosk offline)**.
5. Pronuncia **"A"** o apri la bocca normalmente: il personaggio deve muoversi tra `SILENT` / `SPEAKING` senza attivare `BOCCA A`.
6. Pronuncia **"GOL"**, **"GOAL"** o **"GOOOL"**: il testo riconosciuto compare solo nel Pannello di Controllo, `BOCCA A` parte da `00:00` una sola volta fino a fine video (sia nell'anteprima sia nella Finestra Pulita Output `TWINHITS FACECAM - LIVE OUTPUT`) e ignora ulteriori attivazioni durante i 5 secondi di cooldown.
