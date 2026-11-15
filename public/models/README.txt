CARTELLA MODELLI VOSK OFFLINE (TWINHITS FACECAM)
=================================================

Per abilitare il riconoscimento vocale offline ("GOAL con la voce" su Electron Windows EXE)
senza mostrare errori di rete Chrome:

1. Scarica il modello italiano leggero ufficiale da AlphaCephei:
   https://alphacephei.com/vosk/models/vosk-model-small-it-0.22.zip (~48 MB)

2. Estrai lo .zip e riconfeziona la cartella estratta in formato .tar.gz
   (richiesto dal motore browser/Electron vosk-browser):

   Su Windows 10/11 (PowerShell dentro la cartella in cui hai estratto lo zip):
   tar -czf vosk-model-small-it-0.22.tar.gz vosk-model-small-it-0.22

3. Copia il file risultante dentro questa cartella:
   public/models/vosk-model-small-it-0.22.tar.gz

   (In alternativa puoi anche importare direttamente il file .tar.gz dal pannello
    "1B. GOAL CON LA VOCE -> Importa modello .tar.gz" senza ricompilare l'app,
    oppure usare il nome generico public/models/model.tar.gz).

Nota:
- Durante `npm run build`, Vite copia automaticamente il contenuto di `public/models/`
  in `dist/models/`.
- Non inserire mai chiavi API, token o credenziali in questa cartella.
