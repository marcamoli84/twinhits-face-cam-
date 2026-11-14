import React, { useRef, useEffect } from 'react';
import { ScenographySettings } from '../types/vtuber';
import { STADIUM_ASSETS } from '../utils/stadiumAssets';

interface AnimatedScenographyProps {
  settings: ScenographySettings;
  className?: string;
  isStandalone?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxAlpha: number;
  type: 'smoke_red' | 'smoke_dark' | 'spark' | 'energy_orb';
}

interface CrowdFlash {
  x: number;
  y: number;
  phase: number;
  speed: number;
  color: 'white' | 'red';
}

// Helper: draw rounded rectangle safely
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Helper: draw a gently waving rossonera flag in the stands
function drawWavingFlag(
  ctx: CanvasRenderingContext2D,
  poleX: number,
  poleBaseY: number,
  poleHeight: number,
  flagWidth: number,
  flagHeight: number,
  direction: 1 | -1,
  time: number,
  phase: number,
  bright: number
) {
  ctx.save();
  // Steel flagpole
  ctx.strokeStyle = `rgba(180, 185, 195, ${0.45 * bright})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(poleX, poleBaseY);
  ctx.lineTo(poleX, poleBaseY - poleHeight);
  ctx.stroke();

  const topY = poleBaseY - poleHeight;
  const segments = 6;
  const segW = flagWidth / segments;

  for (let i = 0; i < segments; i++) {
    const x0 = poleX + direction * i * segW;
    const x1 = poleX + direction * (i + 1) * segW;
    const wave0 = Math.sin(time * 2.2 + phase + i * 0.75) * (1.2 + i * 0.9);
    const wave1 = Math.sin(time * 2.2 + phase + (i + 1) * 0.75) * (1.2 + (i + 1) * 0.9);

    // Alternating Rossonero stripes (Red / Black / Red)
    const isRed = i % 2 === 0;
    ctx.fillStyle = isRed
      ? `rgba(215, 22, 34, ${0.88 * bright})`
      : `rgba(12, 12, 16, ${0.9 * bright})`;

    ctx.beginPath();
    ctx.moveTo(x0, topY + wave0);
    ctx.lineTo(x1, topY + wave1);
    ctx.lineTo(x1, topY + flagHeight + wave1);
    ctx.lineTo(x0, topY + flagHeight + wave0);
    ctx.closePath();
    ctx.fill();

    // Subtle fabric fold sheen
    if (i % 2 === 1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.08 * bright})`;
      ctx.fill();
    }
  }
  ctx.restore();
}

export const AnimatedScenography: React.FC<AnimatedScenographyProps> = ({
  settings,
  className = '',
  isStandalone = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const crowdFlashesRef = useRef<CrowdFlash[]>([]);
  const sanSiroImgRef = useRef<HTMLImageElement | null>(null);
  const sanSiroLoadedRef = useRef<boolean>(false);
  const timeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  // Preload realistic San Siro night base image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sanSiroImgRef.current = img;
      sanSiroLoadedRef.current = true;
    };
    img.src = STADIUM_ASSETS.sanSiroNightBase;
  }, []);

  // Initialize procedural particles & crowd flashes
  useEffect(() => {
    const particles: Particle[] = [];
    const count = 42; // Lightweight count for integrated GPU/CPU

    for (let i = 0; i < count; i++) {
      const typeRand = Math.random();
      const type: Particle['type'] =
        typeRand < 0.35 ? 'smoke_red' : typeRand < 0.62 ? 'smoke_dark' : typeRand < 0.9 ? 'spark' : 'energy_orb';

      particles.push({
        x: Math.random() * 720,
        y: 120 + Math.random() * 1080,
        vx: (Math.random() - 0.5) * 0.32,
        vy: -0.22 - Math.random() * 0.42,
        radius: type === 'spark' ? 1.2 + Math.random() * 1.8 : type === 'energy_orb' ? 2.5 + Math.random() * 3.5 : 48 + Math.random() * 68,
        alpha: Math.random() * 0.28,
        maxAlpha: type === 'spark' ? 0.72 : type === 'energy_orb' ? 0.55 : type === 'smoke_red' ? 0.16 : 0.12,
        type,
      });
    }

    particlesRef.current = particles;

    // Crowd camera flashes along left & right stadium tiers (avoiding center face area)
    const flashes: CrowdFlash[] = [];
    for (let i = 0; i < 18; i++) {
      const isLeft = i % 2 === 0;
      const x = isLeft ? 28 + Math.random() * 185 : 507 + Math.random() * 185;
      const y = 515 + Math.random() * 215;
      flashes.push({
        x,
        y,
        phase: Math.random() * Math.PI * 2,
        speed: 1.4 + Math.random() * 2.4,
        color: Math.random() < 0.72 ? 'white' : 'red',
      });
    }
    crowdFlashesRef.current = flashes;
  }, []);

  // Main 2D Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Buffer dimensions 720x1280 (Exact 9:16 vertical TikTok resolution)
    const W = 720;
    const H = 1280;

    let isRunning = true;

    const renderFrame = (now: number) => {
      if (!isRunning) return;

      // Throttle to ~30 FPS to ensure low CPU usage on integrated GPUs
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed < 32 && !settings.isFrozen) {
        animFrameIdRef.current = requestAnimationFrame(renderFrame);
        return;
      }
      lastFrameTimeRef.current = now;

      const dt = settings.isFrozen ? 0 : 0.016 * Math.max(0.1, settings.speed);
      timeRef.current += dt;
      const t = timeRef.current;
      const motion = settings.isFrozen ? 0 : settings.motionIntensity;
      const bright = Math.max(0.3, Math.min(1.5, settings.brightness));
      const theme = settings.theme || 'san_siro_twinhits';

      // =============================================================
      // THEME 0: STADIO TWINHITS 9:16 (San Siro Night Broadcast Arena)
      // =============================================================
      if (theme === 'san_siro_twinhits') {
        // 1. Base Night Stadium Backdrop with subtle slow parallax (no aggressive motion)
        ctx.fillStyle = '#040508';
        ctx.fillRect(0, 0, W, H);

        const parallaxX = Math.sin(t * 0.24) * 9 * motion;
        const parallaxY = Math.cos(t * 0.17) * 5 * motion;

        if (sanSiroLoadedRef.current && sanSiroImgRef.current) {
          const img = sanSiroImgRef.current;
          // Draw scaled slightly (1.04) so parallax drift never exposes canvas edges
          const drawW = W * 1.04;
          const drawH = H * 1.04;
          const drawX = (W - drawW) / 2 + parallaxX;
          const drawY = (H - drawH) / 2 + parallaxY;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        } else {
          const fallbackSky = ctx.createLinearGradient(0, 0, 0, H);
          fallbackSky.addColorStop(0, '#04070D');
          fallbackSky.addColorStop(0.5, '#0C0F16');
          fallbackSky.addColorStop(1, '#050305');
          ctx.fillStyle = fallbackSky;
          ctx.fillRect(0, 0, W, H);
        }

        // Brightness modulation veil (lightweight GPU-friendly replacement for CSS/canvas blur-brightness filters)
        if (bright < 1.0) {
          ctx.fillStyle = `rgba(3, 4, 7, ${(1.0 - bright) * 0.72})`;
          ctx.fillRect(0, 0, W, H);
        } else if (bright > 1.0) {
          ctx.fillStyle = `rgba(255, 240, 242, ${(bright - 1.0) * 0.14})`;
          ctx.fillRect(0, 0, W, H);
        }

        // Subtle animated crowd illumination waves across stands (y: 500..770)
        const crowdWaveAlpha = (0.06 + Math.sin(t * 0.7) * 0.03 * motion) * bright;
        const standWashLeft = ctx.createRadialGradient(140, 620, 20, 140, 620, 240);
        standWashLeft.addColorStop(0, `rgba(229, 26, 36, ${crowdWaveAlpha * 1.5})`);
        standWashLeft.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = standWashLeft;
        ctx.fillRect(0, 440, 360, 350);

        const standWashRight = ctx.createRadialGradient(580, 620, 20, 580, 620, 240);
        standWashRight.addColorStop(0, `rgba(229, 26, 36, ${crowdWaveAlpha * 1.5})`);
        standWashRight.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = standWashRight;
        ctx.fillRect(360, 440, 360, 350);

        // Crowd camera flashes / supporter phone lights on tiers
        crowdFlashesRef.current.forEach((fl) => {
          const pulse = Math.pow(Math.max(0, Math.sin(t * fl.speed + fl.phase)), 12);
          if (pulse > 0.08) {
            const flashAlpha = pulse * (0.65 + motion * 0.25) * bright;
            ctx.fillStyle =
              fl.color === 'white'
                ? `rgba(255, 255, 255, ${flashAlpha})`
                : `rgba(255, 50, 60, ${flashAlpha})`;
            ctx.beginPath();
            ctx.arc(fl.x + parallaxX * 0.5, fl.y + parallaxY * 0.5, 2.2 + pulse * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // 2. Waving Rossonero Flags in the Stands (Left & Right Curvas)
        const flagDriftX = parallaxX * 0.6;
        const flagDriftY = parallaxY * 0.6;
        drawWavingFlag(ctx, 36 + flagDriftX, 745 + flagDriftY, 54, 42, 26, 1, t, 0.2, bright);
        drawWavingFlag(ctx, 92 + flagDriftX, 752 + flagDriftY, 48, 36, 22, 1, t, 1.8, bright);
        drawWavingFlag(ctx, 150 + flagDriftX, 756 + flagDriftY, 44, 32, 20, 1, t, 3.1, bright);
        drawWavingFlag(ctx, 684 + flagDriftX, 745 + flagDriftY, 54, 42, 26, -1, t, 0.9, bright);
        drawWavingFlag(ctx, 628 + flagDriftX, 752 + flagDriftY, 48, 36, 22, -1, t, 2.5, bright);
        drawWavingFlag(ctx, 570 + flagDriftX, 756 + flagDriftY, 44, 32, 20, -1, t, 4.0, bright);

        // 3. Moving Volumetric Stadium Floodlights (Red & White Beams angled clear of center face!)
        const roofLights = [
          { x: 105 + parallaxX * 0.4, y: 390, baseAngle: 0.48, sweep: 0.11, color: 'white' as const, w: 120 },
          { x: 225 + parallaxX * 0.4, y: 375, baseAngle: 0.62, sweep: 0.09, color: 'red' as const, w: 145 },
          { x: 495 + parallaxX * 0.4, y: 375, baseAngle: -0.62, sweep: -0.09, color: 'red' as const, w: 145 },
          { x: 615 + parallaxX * 0.4, y: 390, baseAngle: -0.48, sweep: -0.11, color: 'white' as const, w: 120 },
        ];

        roofLights.forEach((rl, idx) => {
          const sweepAngle = rl.baseAngle + Math.sin(t * 0.45 + idx * 1.4) * rl.sweep * motion;

          // Bright lamp source flare
          const sourceFlare = ctx.createRadialGradient(rl.x, rl.y, 1, rl.x, rl.y, 26);
          if (rl.color === 'white') {
            sourceFlare.addColorStop(0, `rgba(255, 255, 255, ${0.85 * bright})`);
            sourceFlare.addColorStop(0.35, `rgba(220, 232, 255, ${0.35 * bright})`);
            sourceFlare.addColorStop(1, 'rgba(255, 255, 255, 0)');
          } else {
            sourceFlare.addColorStop(0, `rgba(255, 210, 215, ${0.75 * bright})`);
            sourceFlare.addColorStop(0.35, `rgba(229, 26, 36, ${0.42 * bright})`);
            sourceFlare.addColorStop(1, 'rgba(229, 26, 36, 0)');
          }
          ctx.fillStyle = sourceFlare;
          ctx.beginPath();
          ctx.arc(rl.x, rl.y, 26, 0, Math.PI * 2);
          ctx.fill();

          // Volumetric cone beam sweeping cleanly around flanks
          ctx.save();
          ctx.translate(rl.x, rl.y);
          ctx.rotate(sweepAngle);
          const beamGrad = ctx.createLinearGradient(0, 0, 0, 720);
          if (rl.color === 'white') {
            beamGrad.addColorStop(0, `rgba(235, 245, 255, ${0.14 * bright})`);
            beamGrad.addColorStop(0.45, `rgba(210, 225, 255, ${0.045 * bright})`);
            beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          } else {
            beamGrad.addColorStop(0, `rgba(255, 42, 54, ${0.18 * bright})`);
            beamGrad.addColorStop(0.45, `rgba(229, 26, 36, ${0.06 * bright})`);
            beamGrad.addColorStop(1, 'rgba(229, 26, 36, 0)');
          }
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(10, 0);
          ctx.lineTo(rl.w, 720);
          ctx.lineTo(-rl.w, 720);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // 4. SCRITTA TWINHITS #1: GRANDE MAXISCHERMO DELLO STADIO (Upper Oculus y: 74..206)
        ctx.save();
        const jx = 132 + parallaxX * 0.25;
        const jy = 76 + parallaxY * 0.25;
        const jw = 456;
        const jh = 128;

        // Suspension steel cables to stadium roof truss
        ctx.strokeStyle = 'rgba(130, 140, 155, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(jx + 56, 0);
        ctx.lineTo(jx + 56, jy);
        ctx.moveTo(jx + jw - 56, 0);
        ctx.lineTo(jx + jw - 56, jy);
        ctx.stroke();

        // Outer metallic dark steel frame
        drawRoundedRect(ctx, jx - 6, jy - 6, jw + 12, jh + 12, 14);
        ctx.fillStyle = '#0D1017';
        ctx.fill();
        ctx.strokeStyle = `rgba(229, 26, 36, ${0.8 * bright})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#E51A24';
        ctx.shadowBlur = 18 * bright;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner Jumbotron LED screen canvas
        drawRoundedRect(ctx, jx, jy, jw, jh, 10);
        const screenGrad = ctx.createLinearGradient(jx, jy, jx, jy + jh);
        screenGrad.addColorStop(0, '#07080D');
        screenGrad.addColorStop(0.5, '#190509');
        screenGrad.addColorStop(1, '#09090D');
        ctx.fillStyle = screenGrad;
        ctx.fill();

        // Animated light reflection / scan sheen across Jumbotron
        ctx.save();
        ctx.clip();
        const sweepPos = ((t * 95 * motion) % (jw + 240)) - 120;
        const sheen = ctx.createLinearGradient(jx + sweepPos - 60, jy, jx + sweepPos + 60, jy + jh);
        sheen.addColorStop(0, 'rgba(255,255,255,0)');
        sheen.addColorStop(0.5, `rgba(255,255,255,${0.08 * bright})`);
        sheen.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sheen;
        ctx.fillRect(jx, jy, jw, jh);

        // Subtle LED matrix top/bottom red bars
        ctx.fillStyle = `rgba(229, 26, 36, ${0.85 * bright})`;
        ctx.fillRect(jx, jy, jw, 5);
        ctx.fillRect(jx, jy + jh - 5, jw, 5);
        ctx.restore();

        // Jumbotron Micro Status Header
        ctx.font = 'bold 11px "Inter", "Segoe UI", sans-serif';
        ctx.fillStyle = `rgba(255, 80, 90, ${0.95 * bright})`;
        ctx.textAlign = 'center';
        ctx.fillText('● LIVE STADIUM BROADCAST • SERA DI GRANDE CALCIO', jx + jw / 2, jy + 26);

        // MAIN RAZOR-SHARP "TWINHITS" ON JUMBOTRON
        ctx.font = '900 62px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(229, 26, 36, 0.9)';
        ctx.shadowBlur = 16 * bright;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('TWINHITS', jx + jw / 2, jy + 72);
        ctx.shadowBlur = 0;

        // Bottom Rossonero accent rule inside Jumbotron
        ctx.fillStyle = `rgba(229, 26, 36, ${0.9 * bright})`;
        ctx.fillRect(jx + 76, jy + 104, jw - 152, 3);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();

        // 5. SCRITTA TWINHITS #3: GRANDE INSEGNA LUMINOSA DIETRO IL COMMENTATORE (y: 256..342)
        // Positioned on the upper broadcast studio balcony header so it frames behind the commentator without touching face/mouth!
        ctx.save();
        const sx = 96 + parallaxX * 0.15;
        const sy = 262 + parallaxY * 0.15;
        const sw = 528;
        const sh = 76;

        // Smoked architectural glass studio backing
        drawRoundedRect(ctx, sx, sy, sw, sh, 12);
        const studioSignGrad = ctx.createLinearGradient(sx, sy, sx + sw, sy);
        studioSignGrad.addColorStop(0, 'rgba(6, 7, 11, 0.72)');
        studioSignGrad.addColorStop(0.5, 'rgba(18, 6, 9, 0.88)');
        studioSignGrad.addColorStop(1, 'rgba(6, 7, 11, 0.72)');
        ctx.fillStyle = studioSignGrad;
        ctx.fill();

        // Sleek illuminated neon studio border
        const signGlow = (0.7 + Math.sin(t * 1.1) * 0.15 * motion) * bright;
        ctx.strokeStyle = `rgba(229, 26, 36, ${signGlow})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#E51A24';
        ctx.shadowBlur = 14 * bright;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Side glowing red studio light accents
        ctx.fillStyle = `rgba(229, 26, 36, ${0.9 * bright})`;
        ctx.fillRect(sx + 16, sy + 20, 6, sh - 40);
        ctx.fillRect(sx + sw - 22, sy + 20, 6, sh - 40);

        // Razor-sharp Glowing "TWINHITS" Neon Studio Sign
        ctx.font = '900 44px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = `rgba(255, 35, 50, ${0.85 * bright})`;
        ctx.shadowBlur = 18 * bright;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('TWINHITS', sx + sw / 2, sy + sh / 2 + 1);
        ctx.shadowBlur = 0;
        ctx.textBaseline = 'alphabetic';
        ctx.restore();

        // 6. Calm Balanced Center Contrast Zone (keeps House/Goku/Sacchi/Ken crisp and never blinded by lights)
        const centerClear = ctx.createRadialGradient(W / 2, 570, 40, W / 2, 570, 260);
        centerClear.addColorStop(0, 'rgba(4, 5, 8, 0.38)');
        centerClear.addColorStop(0.65, 'rgba(4, 5, 8, 0.18)');
        centerClear.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = centerClear;
        ctx.fillRect(100, 350, 520, 430);

        // 7. SCRITTA TWINHITS #2: PANNELLI PUBBLICITARI LED LUNGO IL CAMPO (y: 774..822)
        if (settings.showLedBoard !== false) {
          const ledY = 774;
          const ledH = 44;

          ctx.save();
          // Pitch LED frame backing
          ctx.fillStyle = 'rgba(6, 7, 10, 0.92)';
          ctx.fillRect(0, ledY, W, ledH);

          // Top & bottom glowing red LED strip borders
          ctx.fillStyle = `rgba(229, 26, 36, ${0.95 * bright})`;
          ctx.fillRect(0, ledY, W, 3);
          ctx.fillRect(0, ledY + ledH - 3, W, 3);

          // Animated perimeter boards scrolling smoothly across the pitch width
          ctx.beginPath();
          ctx.rect(0, ledY + 3, W, ledH - 6);
          ctx.clip();

          const segmentW = 260;
          const scrollX = (t * 58 * motion) % segmentW;
          ctx.textBaseline = 'middle';

          for (let rx = -segmentW; rx < W + segmentW; rx += segmentW) {
            const xStart = rx - scrollX;

            // Crimson block pill
            ctx.fillStyle = `rgba(205, 18, 30, ${0.88 * bright})`;
            ctx.fillRect(xStart + 4, ledY + 7, 126, ledH - 14);

            // Bold "TWINHITS" on LED panel
            ctx.font = '900 18px "Inter", "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('TWINHITS', xStart + 67, ledY + ledH / 2 + 1);

            // Secondary dark panel with live tag / custom text snippet
            ctx.fillStyle = 'rgba(14, 15, 22, 0.95)';
            ctx.fillRect(xStart + 134, ledY + 7, 122, ledH - 14);
            ctx.font = 'bold 12px monospace, sans-serif';
            ctx.fillStyle = `rgba(255, 85, 95, ${0.95 * bright})`;
            ctx.fillText('LIVE STADIUM', xStart + 195, ledY + ledH / 2 + 1);
          }
          ctx.textBaseline = 'alphabetic';
          ctx.restore();

          // Subtle glossy reflection onto turf just below perimeter LED boards
          const ledRefl = ctx.createLinearGradient(0, ledY + ledH, 0, ledY + ledH + 34);
          ledRefl.addColorStop(0, `rgba(229, 26, 36, ${0.24 * bright})`);
          ledRefl.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = ledRefl;
          ctx.fillRect(0, ledY + ledH, W, 34);
        }

        // 8. Elevated Broadcast Studio Dark Glass & Steel Deck (Bottom Horizon y: 920..1280)
        const deckY = 935;
        const deckGrad = ctx.createLinearGradient(0, deckY, 0, H);
        deckGrad.addColorStop(0, 'rgba(10, 11, 16, 0.72)');
        deckGrad.addColorStop(0.25, 'rgba(7, 8, 12, 0.92)');
        deckGrad.addColorStop(1, '#040406');
        ctx.fillStyle = deckGrad;
        ctx.fillRect(0, deckY, W, H - deckY);

        // Curved Broadcast Stage Podium Rim & Neon Red Strip
        ctx.save();
        ctx.strokeStyle = `rgba(229, 26, 36, ${0.85 * bright})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#E51A24';
        ctx.shadowBlur = 16 * bright;
        ctx.beginPath();
        ctx.ellipse(W / 2, deckY + 18, 340, 26, 0, Math.PI, 0, false);
        ctx.stroke();

        // Secondary white architectural floor ring
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 * bright})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(W / 2, deckY + 56, 355, 28, 0, Math.PI, 0, false);
        ctx.stroke();

        // Dynamic light reflection pool on glossy studio deck
        const deckPulse = 0.26 + Math.sin(t * 0.85) * 0.06 * motion;
        const floorPool = ctx.createRadialGradient(W / 2, deckY + 145, 20, W / 2, deckY + 145, 290);
        floorPool.addColorStop(0, `rgba(229, 26, 36, ${deckPulse * bright})`);
        floorPool.addColorStop(0.55, `rgba(120, 12, 22, ${deckPulse * 0.45 * bright})`);
        floorPool.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = floorPool;
        ctx.beginPath();
        ctx.ellipse(W / 2, deckY + 145, 300, 82, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // =============================================================
      // THEME 1: STUDIO LED ROSSONERO (Modern Broadcast Talk Show)
      // =============================================================
      else if (theme === 'studio_led') {
        // 1. Dark Studio Gradient Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#040507');
        bgGrad.addColorStop(0.4, '#090A0F');
        bgGrad.addColorStop(0.75, '#120508');
        bgGrad.addColorStop(1, '#050203');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // 2. Curved Acoustic Panels with Red LED Edge Backlights
        // Left Curved Wall
        ctx.save();
        ctx.fillStyle = '#08090D';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(160, 480, 70, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();

        // Left Neon Red Trim
        const pulseLeft = 0.65 + Math.sin(t * 0.9) * 0.15 * motion;
        ctx.strokeStyle = `rgba(229, 26, 36, ${pulseLeft * bright})`;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#E51A24';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.quadraticCurveTo(162, 480, 72, H);
        ctx.stroke();

        // Right Curved Wall
        ctx.fillStyle = '#08090D';
        ctx.beginPath();
        ctx.moveTo(W, 0);
        ctx.quadraticCurveTo(W - 160, 480, W - 70, H);
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();

        // Right Neon Red Trim
        const pulseRight = 0.65 + Math.cos(t * 0.9) * 0.15 * motion;
        ctx.strokeStyle = `rgba(229, 26, 36, ${pulseRight * bright})`;
        ctx.beginPath();
        ctx.moveTo(W - 2, 0);
        ctx.quadraticCurveTo(W - 162, 480, W - 72, H);
        ctx.stroke();
        ctx.restore();

        // 3. Center Studio Ring Light / Halo in background
        const haloY = 460;
        ctx.save();
        ctx.shadowColor = '#E51A24';
        ctx.shadowBlur = 24 * bright;
        ctx.strokeStyle = `rgba(229, 26, 36, ${0.45 * bright})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(W / 2, haloY, 220, 0, Math.PI * 2);
        ctx.stroke();

        // Inner White Accent Ring
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * bright})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(W / 2, haloY, 216, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 4. Overhead Soft Studio Downlights (Television Spotlights)
        const spots = [
          { x: 190, y: 0, targetX: 280, angle: 0.15 + Math.sin(t * 0.5) * 0.04 * motion },
          { x: 530, y: 0, targetX: 440, angle: -0.15 - Math.cos(t * 0.5) * 0.04 * motion },
        ];
        spots.forEach((sp) => {
          ctx.save();
          const spotGrad = ctx.createRadialGradient(sp.x, 0, 2, sp.targetX, 600, 320);
          spotGrad.addColorStop(0, `rgba(255, 60, 70, ${0.18 * bright})`);
          spotGrad.addColorStop(0.5, `rgba(229, 26, 36, ${0.06 * bright})`);
          spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = spotGrad;
          ctx.beginPath();
          ctx.moveTo(sp.x - 30, 0);
          ctx.lineTo(sp.x + 30, 0);
          ctx.lineTo(sp.targetX + 160, 950);
          ctx.lineTo(sp.targetX - 160, 950);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // 5. Glossy Studio Floor & Podium Reflections at bottom
        const floorY = 940;
        const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
        floorGrad.addColorStop(0, `rgba(18, 6, 8, ${0.85 * bright})`);
        floorGrad.addColorStop(0.4, `rgba(28, 8, 12, ${0.9 * bright})`);
        floorGrad.addColorStop(1, '#050203');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, floorY, W, H - floorY);

        // Floor Horizon Horizon Light Strip (Neon Red)
        ctx.save();
        ctx.strokeStyle = `rgba(229, 26, 36, ${0.8 * bright})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#E51A24';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(W / 2, floorY, 320, 28, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Concentric podium tier
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * bright})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(W / 2, floorY + 45, 340, 30, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Floor glossy ambient reflection pool
        const floorReflect = ctx.createRadialGradient(W / 2, floorY + 120, 20, W / 2, floorY + 120, 260);
        floorReflect.addColorStop(0, `rgba(229, 26, 36, ${0.35 * bright})`);
        floorReflect.addColorStop(0.7, `rgba(150, 10, 20, ${0.12 * bright})`);
        floorReflect.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = floorReflect;
        ctx.beginPath();
        ctx.ellipse(W / 2, floorY + 120, 270, 75, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // =============================================================
      // THEME 2: STADIO FUTURISTICO (Futuristic San Siro Night)
      // =============================================================
      else if (theme === 'stadium_future') {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, '#040508');
        skyGrad.addColorStop(0.35, '#0B0D15');
        skyGrad.addColorStop(0.65, '#140608');
        skyGrad.addColorStop(1, '#050203');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // Tier 3 Silhouette
        ctx.fillStyle = '#080A0F';
        ctx.beginPath();
        ctx.ellipse(W / 2, 590, 480, 160, 0, Math.PI, 0, false);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();

        // Tier 2 Middle Tribune with architectural columns
        ctx.fillStyle = '#0F1118';
        ctx.beginPath();
        ctx.ellipse(W / 2, 700, 420, 140, 0, Math.PI, 0, false);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();

        // Structural Columns
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 3;
        for (let colX = 60; colX <= 660; colX += 50) {
          ctx.beginPath();
          ctx.moveTo(colX, 520);
          ctx.lineTo(colX + (colX - W / 2) * 0.15, 820);
          ctx.stroke();
        }

        // Tier 1 Lower Ring
        ctx.fillStyle = '#16090B';
        ctx.beginPath();
        ctx.ellipse(W / 2, 820, 390, 130, 0, Math.PI, 0, false);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();

        // Pitch illumination at bottom
        const pitchGrad = ctx.createRadialGradient(W / 2, 1180, 50, W / 2, 1180, 420);
        pitchGrad.addColorStop(0, `rgba(18, 55, 28, ${0.45 * bright})`);
        pitchGrad.addColorStop(0.6, `rgba(10, 25, 15, ${0.3 * bright})`);
        pitchGrad.addColorStop(1, 'rgba(5, 5, 8, 0)');
        ctx.fillStyle = pitchGrad;
        ctx.beginPath();
        ctx.ellipse(W / 2, 1180, 400, 140, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4 Main Floodlight Towers with Volumetric Beams
        const floodlights = [
          { x: 100, y: 180, angle: 0.65 + Math.sin(t * 0.8) * 0.08 * motion },
          { x: 250, y: 150, angle: 0.4 + Math.sin(t * 0.6 + 1) * 0.06 * motion },
          { x: 470, y: 150, angle: -0.4 - Math.cos(t * 0.6 + 1) * 0.06 * motion },
          { x: 620, y: 180, angle: -0.65 - Math.sin(t * 0.8) * 0.08 * motion },
        ];

        floodlights.forEach((fl) => {
          const flareGrad = ctx.createRadialGradient(fl.x, fl.y, 2, fl.x, fl.y, 40);
          flareGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * bright})`);
          flareGrad.addColorStop(0.3, `rgba(255, 60, 70, ${0.6 * bright})`);
          flareGrad.addColorStop(1, 'rgba(229, 26, 36, 0)');
          ctx.fillStyle = flareGrad;
          ctx.beginPath();
          ctx.arc(fl.x, fl.y, 40, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.translate(fl.x, fl.y);
          ctx.rotate(fl.angle);
          const beamGrad = ctx.createLinearGradient(0, 0, 0, 850);
          beamGrad.addColorStop(0, `rgba(255, 40, 50, ${0.2 * bright})`);
          beamGrad.addColorStop(0.4, `rgba(229, 26, 36, ${0.08 * bright})`);
          beamGrad.addColorStop(1, 'rgba(229, 26, 36, 0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(-15, 0);
          ctx.lineTo(15, 0);
          ctx.lineTo(120, 850);
          ctx.lineTo(-120, 850);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        // Curved Stadium LED Ribbon
        const ledY = 760;
        ctx.save();
        ctx.strokeStyle = `rgba(229, 26, 36, ${0.75 * bright})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#E51A24';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(W / 2, ledY, 360, 60, 0, Math.PI, 0, false);
        ctx.stroke();
        ctx.restore();
      }

      // =============================================================
      // THEME 3: ARENA ENERGIA (Cyber Tournament / eSports / Goku)
      // =============================================================
      else if (theme === 'energy_arena') {
        const cyberGrad = ctx.createLinearGradient(0, 0, 0, H);
        cyberGrad.addColorStop(0, '#060307');
        cyberGrad.addColorStop(0.4, '#10050B');
        cyberGrad.addColorStop(0.8, '#180408');
        cyberGrad.addColorStop(1, '#060103');
        ctx.fillStyle = cyberGrad;
        ctx.fillRect(0, 0, W, H);

        // Perspective Hexagonal Energy Grid on floor
        ctx.save();
        ctx.strokeStyle = `rgba(255, 46, 59, ${0.2 * bright})`;
        ctx.lineWidth = 1.5;
        const gridHorizon = 860;

        // Radiating perspective lines
        for (let gx = -100; gx <= W + 100; gx += 65) {
          ctx.beginPath();
          ctx.moveTo(W / 2, gridHorizon - 80);
          ctx.lineTo(gx, H);
          ctx.stroke();
        }

        // Horizontal perspective depth lines
        for (let gy = gridHorizon; gy <= H; gy += 42) {
          const ratio = (gy - gridHorizon) / (H - gridHorizon);
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.strokeStyle = `rgba(255, 46, 59, ${(0.1 + ratio * 0.25) * bright})`;
          ctx.stroke();
        }
        ctx.restore();

        // 2 Cyber Energy Conduit Pillars on Left & Right
        const pillarWidth = 45;
        const pulseEnergy = 0.5 + Math.sin(t * 1.5) * 0.25 * motion;

        // Left Pillar
        ctx.save();
        ctx.fillStyle = '#0B0408';
        ctx.fillRect(20, 140, pillarWidth, 750);
        ctx.strokeStyle = `rgba(255, 46, 59, ${pulseEnergy * bright})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FF2E3B';
        ctx.shadowBlur = 16;
        ctx.strokeRect(20, 140, pillarWidth, 750);

        // Right Pillar
        ctx.fillStyle = '#0B0408';
        ctx.fillRect(W - 20 - pillarWidth, 140, pillarWidth, 750);
        ctx.strokeStyle = `rgba(255, 46, 59, ${pulseEnergy * bright})`;
        ctx.strokeRect(W - 20 - pillarWidth, 140, pillarWidth, 750);
        ctx.restore();

        // Central Power Core Flare
        ctx.save();
        const coreFlare = ctx.createRadialGradient(W / 2, 450, 20, W / 2, 450, 260);
        coreFlare.addColorStop(0, `rgba(255, 255, 255, ${0.5 * bright})`);
        coreFlare.addColorStop(0.3, `rgba(255, 46, 59, ${0.35 * bright})`);
        coreFlare.addColorStop(0.7, `rgba(180, 10, 25, ${0.1 * bright})`);
        coreFlare.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreFlare;
        ctx.beginPath();
        ctx.arc(W / 2, 450, 260, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // =============================================================
      // UNIVERSAL TICKER / LED RIBBON BOARD (Legacy Themes)
      // =============================================================
      if (settings.showLedBoard && theme !== 'san_siro_twinhits') {
        const ribbonY = theme === 'studio_led' ? 790 : theme === 'stadium_future' ? 775 : 810;
        ctx.save();
        ctx.beginPath();
        ctx.rect(36, ribbonY, W - 72, 36);
        ctx.clip();

        ctx.fillStyle = 'rgba(6, 6, 9, 0.82)';
        ctx.fillRect(36, ribbonY, W - 72, 36);

        // Neon border around ticker
        ctx.strokeStyle = `rgba(229, 26, 36, ${0.65 * bright})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(36, ribbonY, W - 72, 36);

        // Moving Marquee text
        ctx.font = 'bold 14px monospace, sans-serif';
        ctx.fillStyle = `rgba(255, 55, 65, ${0.95 * bright})`;
        ctx.shadowColor = '#E51A24';
        ctx.shadowBlur = 8;
        const text = settings.ledText || 'TWINHITS LIVE • TELECRONACA ROSSONERA • TIKTOK LIVE • FORZA MILAN';
        const textWidth = ctx.measureText(text).width + 80;
        const scrollOffset = (t * 48 * motion) % textWidth;

        ctx.fillText(text, 50 - scrollOffset, ribbonY + 23);
        ctx.fillText(text, 50 - scrollOffset + textWidth, ribbonY + 23);
        ctx.fillText(text, 50 - scrollOffset + textWidth * 2, ribbonY + 23);
        ctx.restore();
      }

      // =============================================================
      // PROCEDURAL PARTICLES & DISCRETE ATMOSPHERIC SMOKE
      // =============================================================
      const smokeFactor = settings.smokeIntensity;
      if (smokeFactor > 0.05) {
        particlesRef.current.forEach((p) => {
          if (!settings.isFrozen) {
            p.x += p.vx * motion;
            p.y += p.vy * motion;
            p.alpha += 0.003 * motion;

            if (p.y < 80 || p.x < -80 || p.x > W + 80) {
              p.y = 900 + Math.random() * 300;
              p.x = Math.random() * W;
              p.alpha = 0.02;
            }
          }

          // Keep center face/mouth box clear from heavy smoke or bright flares
          const inCenterFaceZone =
            theme === 'san_siro_twinhits' &&
            p.x > 220 &&
            p.x < 500 &&
            p.y > 440 &&
            p.y < 730;
          const zoneScale = inCenterFaceZone ? 0.25 : 1.0;

          const currentAlpha = Math.min(p.maxAlpha, p.alpha) * smokeFactor * bright * zoneScale;

          if (p.type === 'smoke_red') {
            const smokeGrad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.1, p.x, p.y, p.radius);
            smokeGrad.addColorStop(0, `rgba(229, 26, 36, ${currentAlpha})`);
            smokeGrad.addColorStop(0.5, `rgba(180, 15, 25, ${currentAlpha * 0.6})`);
            smokeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = smokeGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'smoke_dark') {
            const darkGrad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.1, p.x, p.y, p.radius);
            darkGrad.addColorStop(0, `rgba(10, 10, 14, ${currentAlpha * 0.9})`);
            darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = darkGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Spark / Light Speckle
            ctx.fillStyle = `rgba(255, 230, 210, ${currentAlpha * 1.6})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // =============================================================
      // BROADCAST TOP VIGNETTE & STANDALONE BADGE
      // =============================================================
      const topGrad = ctx.createLinearGradient(0, 0, 0, 110);
      topGrad.addColorStop(0, `rgba(229, 26, 36, ${0.28 * bright})`);
      topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, 110);

      // Vignette shadows around outer edges
      const vigGrad = ctx.createRadialGradient(W / 2, H / 2, 420, W / 2, H / 2, 720);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.58)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, W, H);

      if (isStandalone) {
        ctx.fillStyle = 'rgba(255, 46, 59, 0.9)';
        ctx.font = 'bold 13px sans-serif';
        const themeLabel =
          theme === 'san_siro_twinhits'
            ? 'STADIO SAN SIRO 9:16'
            : theme === 'studio_led'
            ? 'STUDIO LED ROSSONERO 9:16'
            : theme === 'stadium_future'
            ? 'STADIO FUTURISTICO 9:16'
            : 'ARENA ENERGIA 9:16';
        ctx.fillText(`TWINHITS • ${themeLabel}`, 24, 40);
      }

      if (!settings.isFrozen) {
        animFrameIdRef.current = requestAnimationFrame(renderFrame);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [settings, isStandalone]);

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={1280}
      className={`w-full h-full object-cover select-none pointer-events-none ${className}`}
      style={{ imageRendering: 'auto' }}
    />
  );
};
