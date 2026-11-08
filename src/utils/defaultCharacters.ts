import { Character } from '../types/vtuber';

// Helper to convert SVG strings to Data URIs (Base64 for reliable cross-browser image loading)
const svgToDataUrl = (svgString: string) => {
  try {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgString.trim())))}`;
    }
  } catch (e) {
    console.warn('Encoding SVG to base64 fallback', e);
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString.trim())}`;
};

/* -------------------------------------------------------------
   Character 1: "Telecronista Rossonero"
   Sport commentator with headphones, microphone, rossoneri jersey
   ------------------------------------------------------------- */
const telecronistaBase = (mouthContent: string, eyesContent: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">
  <defs>
    <linearGradient id="jerseyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E51A24"/>
      <stop offset="20%" stop-color="#E51A24"/>
      <stop offset="20.1%" stop-color="#111113"/>
      <stop offset="40%" stop-color="#111113"/>
      <stop offset="40.1%" stop-color="#E51A24"/>
      <stop offset="60%" stop-color="#E51A24"/>
      <stop offset="60.1%" stop-color="#111113"/>
      <stop offset="80%" stop-color="#111113"/>
      <stop offset="80.1%" stop-color="#E51A24"/>
      <stop offset="100%" stop-color="#E51A24"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Torso / Jersey Rossonera -->
  <path d="M 90 340 Q 200 360 310 340 L 360 480 L 40 480 Z" fill="url(#jerseyGrad)" />
  <!-- Collar -->
  <path d="M 150 340 Q 200 380 250 340 L 235 320 Q 200 345 165 320 Z" fill="#FFFFFF" />
  <circle cx="200" cy="375" r="10" fill="#E51A24" />

  <!-- Neck -->
  <path d="M 165 270 L 165 330 Q 200 345 235 330 L 235 270 Z" fill="#F4B892" />
  <path d="M 165 295 Q 200 320 235 295 L 235 270 L 165 270 Z" fill="#E09F75" opacity="0.4" />

  <!-- Head Background / Ears -->
  <circle cx="118" cy="195" r="22" fill="#F4B892" />
  <circle cx="118" cy="195" r="13" fill="#E09F75" />
  <circle cx="282" cy="195" r="22" fill="#F4B892" />
  <circle cx="282" cy="195" r="13" fill="#E09F75" />

  <!-- Head / Face -->
  <ellipse cx="200" cy="195" rx="88" ry="102" fill="#FCD0B1" filter="url(#shadow)" />
  <!-- Blush -->
  <ellipse cx="145" cy="225" rx="14" ry="7" fill="#F2727D" opacity="0.35" />
  <ellipse cx="255" cy="225" rx="14" ry="7" fill="#F2727D" opacity="0.35" />

  <!-- Hair -->
  <path d="M 112 180 Q 105 105 200 95 Q 295 105 288 180 Q 265 125 200 125 Q 135 125 112 180 Z" fill="#241E1C" />
  <path d="M 125 140 Q 165 110 205 135 Q 240 120 270 145 Q 235 130 195 145 Z" fill="#3D322E" />

  <!-- Eyebrows -->
  <path d="M 140 152 Q 165 140 182 152" stroke="#241E1C" stroke-width="5" stroke-linecap="round" fill="none" />
  <path d="M 218 152 Q 235 140 260 152" stroke="#241E1C" stroke-width="5" stroke-linecap="round" fill="none" />

  <!-- Eyes (dynamic) -->
  ${eyesContent}

  <!-- Nose -->
  <path d="M 197 190 Q 204 205 194 212 Q 200 216 208 212" stroke="#D18359" stroke-width="3" stroke-linecap="round" fill="none" />

  <!-- Mouth (dynamic) -->
  ${mouthContent}

  <!-- Commentator Headset / Cuffie da Streaming -->
  <path d="M 108 190 A 100 110 0 0 1 292 190" fill="none" stroke="#2D3748" stroke-width="14" stroke-linecap="round" />
  <path d="M 112 185 A 95 105 0 0 1 288 185" fill="none" stroke="#E51A24" stroke-width="4" stroke-linecap="round" />
  <!-- Left Ear Cushion -->
  <rect x="94" y="165" width="22" height="60" rx="10" fill="#1A202C" stroke="#E51A24" stroke-width="2.5" />
  <!-- Right Ear Cushion -->
  <rect x="284" y="165" width="22" height="60" rx="10" fill="#1A202C" stroke="#E51A24" stroke-width="2.5" />
  <!-- Mic Boom & Pop Filter -->
  <path d="M 100 210 Q 95 270 160 272" fill="none" stroke="#4A5568" stroke-width="5" stroke-linecap="round" />
  <rect x="156" y="260" width="26" height="22" rx="7" fill="#111113" stroke="#E51A24" stroke-width="2" />
  <circle cx="169" cy="271" r="3" fill="#E51A24" />
</svg>
`;

const eyesOpen = `
  <g>
    <!-- Left Eye -->
    <ellipse cx="162" cy="178" rx="14" ry="17" fill="#FFFFFF" />
    <circle cx="164" cy="178" r="9" fill="#201C1B" />
    <circle cx="167" cy="174" r="3.5" fill="#FFFFFF" />
    <!-- Right Eye -->
    <ellipse cx="238" cy="178" rx="14" ry="17" fill="#FFFFFF" />
    <circle cx="236" cy="178" r="9" fill="#201C1B" />
    <circle cx="239" cy="174" r="3.5" fill="#FFFFFF" />
  </g>
`;

const eyesClosed = `
  <g>
    <!-- Left Closed Eye -->
    <path d="M 148 180 Q 162 194 176 180" stroke="#241E1C" stroke-width="4.5" stroke-linecap="round" fill="none" />
    <!-- Right Closed Eye -->
    <path d="M 224 180 Q 238 194 252 180" stroke="#241E1C" stroke-width="4.5" stroke-linecap="round" fill="none" />
  </g>
`;

const mouthSilent = `
  <g>
    <!-- Closed mouth smiling -->
    <path d="M 178 238 Q 200 248 222 238" stroke="#873024" stroke-width="4" stroke-linecap="round" fill="none" />
  </g>
`;

const mouthSpeaking = `
  <g>
    <!-- Open enthusiastic mouth -->
    <path d="M 172 232 Q 200 228 228 232 Q 232 268 200 270 Q 168 268 172 232 Z" fill="#5E0F14" stroke="#873024" stroke-width="3" />
    <!-- Upper Teeth -->
    <path d="M 176 233 Q 200 236 224 233 L 222 242 Q 200 244 178 242 Z" fill="#FFFFFF" />
    <!-- Tongue -->
    <path d="M 184 258 Q 200 250 216 258 Q 210 268 200 269 Q 190 268 184 258 Z" fill="#E85D6B" />
  </g>
`;

const mouthPhonemeA = `
  <g>
    <!-- Wide open 'A' mouth -->
    <ellipse cx="200" cy="248" rx="28" ry="24" fill="#5E0F14" stroke="#873024" stroke-width="3" />
    <path d="M 178 240 Q 200 243 222 240 L 220 247 Q 200 249 180 247 Z" fill="#FFFFFF" />
    <ellipse cx="200" cy="262" rx="18" ry="9" fill="#E85D6B" />
  </g>
`;

const mouthPhonemeO = `
  <g>
    <!-- Round 'O' mouth -->
    <ellipse cx="200" cy="248" rx="17" ry="20" fill="#5E0F14" stroke="#873024" stroke-width="3.5" />
    <ellipse cx="200" cy="260" rx="10" ry="6" fill="#E85D6B" />
  </g>
`;

const mouthPhonemeE = `
  <g>
    <!-- Wide grin 'E' mouth -->
    <path d="M 168 238 Q 200 232 232 238 Q 228 256 200 257 Q 172 256 168 238 Z" fill="#5E0F14" stroke="#873024" stroke-width="3" />
    <!-- White teeth row -->
    <path d="M 172 239 Q 200 242 228 239 L 226 247 Q 200 250 174 247 Z" fill="#FFFFFF" />
    <path d="M 180 251 Q 200 248 220 251 Q 210 256 200 256 Q 190 256 180 251 Z" fill="#E85D6B" />
  </g>
`;

/* -------------------------------------------------------------
   Character 2: "Bomber d'Attacco"
   Football striker with red-and-black sport headband and fiery eyes
   ------------------------------------------------------------- */
const bomberBase = (mouthContent: string, eyesContent: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">
  <defs>
    <linearGradient id="bomberJacket" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#18181B"/>
      <stop offset="100%" stop-color="#09090B"/>
    </linearGradient>
  </defs>

  <!-- Torso / Jacket -->
  <path d="M 80 350 Q 200 375 320 350 L 370 480 L 30 480 Z" fill="url(#bomberJacket)" />
  <path d="M 130 355 L 200 480 L 270 355" stroke="#E51A24" stroke-width="12" fill="none" />
  <path d="M 195 380 L 195 480" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="6,4" />

  <!-- Neck -->
  <path d="M 160 270 L 160 340 Q 200 355 240 340 L 240 270 Z" fill="#E8B08A" />

  <!-- Ears -->
  <circle cx="112" cy="200" r="20" fill="#E8B08A" />
  <circle cx="288" cy="200" r="20" fill="#E8B08A" />

  <!-- Head -->
  <ellipse cx="200" cy="200" rx="90" ry="105" fill="#F8C4A2" />

  <!-- Sport Headband (Fascia Rossonera) -->
  <path d="M 110 152 Q 200 135 290 152 L 292 180 Q 200 162 108 180 Z" fill="#E51A24" />
  <path d="M 110 163 Q 200 146 290 163" stroke="#FFFFFF" stroke-width="4" fill="none" />

  <!-- Spiky Hair -->
  <path d="M 110 155 Q 85 90 150 75 Q 165 40 200 65 Q 235 40 250 75 Q 315 90 290 155 Q 240 120 200 125 Q 160 120 110 155 Z" fill="#3B261A" />

  <!-- Eyebrows (Fiery / Fierce) -->
  <path d="M 135 168 L 180 162" stroke="#24140D" stroke-width="6" stroke-linecap="round" />
  <path d="M 265 168 L 220 162" stroke="#24140D" stroke-width="6" stroke-linecap="round" />

  <!-- Eyes (dynamic) -->
  ${eyesContent}

  <!-- Nose -->
  <path d="M 198 198 L 194 216 L 206 216" stroke="#C88863" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />

  <!-- Mouth (dynamic) -->
  ${mouthContent}
</svg>
`;

const bomberEyesOpen = `
  <g>
    <!-- Left Eye -->
    <ellipse cx="160" cy="186" rx="15" ry="14" fill="#FFFFFF" />
    <circle cx="162" cy="186" r="8" fill="#1C1815" />
    <circle cx="165" cy="183" r="3" fill="#FFFFFF" />
    <!-- Right Eye -->
    <ellipse cx="240" cy="186" rx="15" ry="14" fill="#FFFFFF" />
    <circle cx="238" cy="186" r="8" fill="#1C1815" />
    <circle cx="241" cy="183" r="3" fill="#FFFFFF" />
  </g>
`;

const bomberEyesClosed = `
  <g>
    <path d="M 146 188 L 174 188" stroke="#24140D" stroke-width="5" stroke-linecap="round" />
    <path d="M 226 188 L 254 188" stroke="#24140D" stroke-width="5" stroke-linecap="round" />
  </g>
`;

const bomberMouthSilent = `
  <g>
    <path d="M 175 244 Q 200 248 225 244" stroke="#68241C" stroke-width="4.5" stroke-linecap="round" fill="none" />
  </g>
`;

const bomberMouthSpeaking = `
  <g>
    <path d="M 170 236 Q 200 230 230 236 Q 235 272 200 274 Q 165 272 170 236 Z" fill="#4A0B10" stroke="#7A2218" stroke-width="3" />
    <path d="M 175 237 Q 200 241 225 237 L 222 245 Q 200 247 178 245 Z" fill="#FFFFFF" />
    <ellipse cx="200" cy="265" rx="14" ry="7" fill="#E51A24" />
  </g>
`;

/* -------------------------------------------------------------
   Preset Characters Array
   ------------------------------------------------------------- */
export const DEFAULT_CHARACTERS: Character[] = [
  {
    id: 'telecronista_rossonero',
    name: 'Telecronista Rossonero',
    description: 'Il conduttore ufficiale con cuffie da telecronaca e maglia rossonera.',
    isPreset: true,
    anchorX: 0.5,
    anchorY: 0.85,
    images: {
      silent: svgToDataUrl(telecronistaBase(mouthSilent, eyesOpen)),
      speaking: svgToDataUrl(telecronistaBase(mouthSpeaking, eyesOpen)),
      mouthA: svgToDataUrl(telecronistaBase(mouthPhonemeA, eyesOpen)),
      mouthE: svgToDataUrl(telecronistaBase(mouthPhonemeE, eyesOpen)),
      mouthO: svgToDataUrl(telecronistaBase(mouthPhonemeO, eyesOpen)),
      eyesClosed: svgToDataUrl(telecronistaBase(mouthSilent, eyesClosed)),
    },
  },
  {
    id: 'bomber_cartoon',
    name: "Bomber d'Attacco",
    description: 'Attaccante grintoso con fascia rossonera ed esultanze da urlo.',
    isPreset: true,
    anchorX: 0.5,
    anchorY: 0.85,
    images: {
      silent: svgToDataUrl(bomberBase(bomberMouthSilent, bomberEyesOpen)),
      speaking: svgToDataUrl(bomberBase(bomberMouthSpeaking, bomberEyesOpen)),
      eyesClosed: svgToDataUrl(bomberBase(bomberMouthSilent, bomberEyesClosed)),
    },
  },
];
