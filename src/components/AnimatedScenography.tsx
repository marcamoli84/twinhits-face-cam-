import React, { useRef, useEffect } from 'react';
import { ScenographySettings } from '../types/vtuber';

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

export const AnimatedScenography: React.FC<AnimatedScenographyProps> = ({
  settings,
  className = '',
  isStandalone = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  // Initialize procedural particles
  useEffect(() => {
    const particles: Particle[] = [];
    const count = 38; // Lightweight count for low-end GPU/CPU

    for (let i = 0; i < count; i++) {
      const typeRand = Math.random();
      const type: Particle['type'] =
        typeRand < 0.4 ? 'smoke_red' : typeRand < 0.7 ? 'smoke_dark' : typeRand < 0.9 ? 'spark' : 'energy_orb';

      particles.push({
        x: Math.random() * 720,
        y: 100 + Math.random() * 1050,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.25 - Math.random() * 0.45,
        radius: type === 'spark' ? 1.5 + Math.random() * 2 : type === 'energy_orb' ? 3 + Math.random() * 4 : 45 + Math.random() * 65,
        alpha: Math.random() * 0.3,
        maxAlpha: type === 'spark' ? 0.75 : type === 'energy_orb' ? 0.6 : type === 'smoke_red' ? 0.22 : 0.14,
        type,
      });
    }

    particlesRef.current = particles;
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
      const theme = settings.theme || 'studio_led';

      // =============================================================
      // THEME 1: STUDIO LED ROSSONERO (Modern Broadcast Talk Show)
      // =============================================================
      if (theme === 'studio_led') {
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
      // UNIVERSAL TICKER / LED RIBBON BOARD (Optional)
      // =============================================================
      if (settings.showLedBoard) {
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

          const currentAlpha = Math.min(p.maxAlpha, p.alpha) * smokeFactor * bright;

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
      vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, W, H);

      if (isStandalone) {
        ctx.fillStyle = 'rgba(255, 46, 59, 0.9)';
        ctx.font = 'bold 13px sans-serif';
        const themeLabel =
          theme === 'studio_led'
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
