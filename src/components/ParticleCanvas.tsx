import React, { useEffect, useRef } from 'react';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  rotSpeed: number;
  type: 'coin' | 'spark' | 'star' | 'ember' | 'matthew_rain';
  gravity: number;
  imageSrc?: string;
}

// Cap particles for smooth 60fps Chromebook performance
const MAX_PARTICLES = 65;

class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animId: number | null = null;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private spriteCanvasCache: Map<string, HTMLCanvasElement> = new Map();
  public enabled: boolean = true;
  public reducedMotion: boolean = false;

  public init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.startLoop();
  }

  public resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private getPreRenderedSprite(src: string): HTMLCanvasElement | null {
    if (typeof Image === 'undefined' || typeof document === 'undefined') return null;

    const cachedCanvas = this.spriteCanvasCache.get(src);
    if (cachedCanvas) return cachedCanvas;

    let img = this.imageCache.get(src);
    if (!img) {
      img = new Image();
      img.src = src;
      this.imageCache.set(src, img);
    }

    if (img.complete && img.naturalWidth > 0) {
      const offscreen = document.createElement('canvas');
      offscreen.width = 48;
      offscreen.height = 48;
      const octx = offscreen.getContext('2d');
      if (octx) {
        octx.beginPath();
        octx.arc(24, 24, 22, 0, Math.PI * 2);
        octx.closePath();
        octx.clip();
        octx.drawImage(img, 2, 2, 44, 44);
        octx.beginPath();
        octx.arc(24, 24, 22, 0, Math.PI * 2);
        octx.lineWidth = 3;
        octx.strokeStyle = '#e879f9';
        octx.stroke();
        this.spriteCanvasCache.set(src, offscreen);
        return offscreen;
      }
    }
    return null;
  }

  private pushBounded(p: Particle) {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  public getActiveCount(): number {
    return this.particles.length;
  }

  public emitClick(x: number, y: number, isCrit: boolean, count = 6) {
    if (!this.enabled || this.reducedMotion) return;

    const actualCount = isCrit ? Math.min(12, count * 2) : Math.min(8, count);
    const colors = isCrit
      ? ['#00f0ff', '#ff007f', '#ffffff', '#ffd700']
      : ['#ffd700', '#ffaa00', '#00f0ff', '#ffffff'];

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (isCrit ? 5 : 3) + Math.random() * (isCrit ? 8 : 5);
      this.pushBounded({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isCrit ? 3.5 : 2),
        size: isCrit ? 4 + Math.random() * 4 : 3 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.03 + Math.random() * 0.02,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        type: isCrit ? 'spark' : 'coin',
        gravity: 0.25,
      });
    }
  }

  public emitPrestige() {
    if (!this.enabled || this.reducedMotion || !this.canvas) return;
    const colors = ['#00f0ff', '#9d4edd', '#ff007f', '#ffd700', '#ffffff'];
    for (let i = 0; i < 36; i++) {
      const x = Math.random() * this.canvas.width;
      const y = this.canvas.height + 20;
      this.pushBounded({
        x,
        y,
        vx: (Math.random() - 0.5) * 7,
        vy: -(8 + Math.random() * 12),
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.01,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        type: 'star',
        gravity: 0.1,
      });
    }
  }

  /**
   * Cosmetic Matthew Rain (used on Skin Unlock & during Matthew Storm live event).
   * Optimized for Chromebooks using pre-clipped offscreen canvases!
   */
  public emitMatthewRain(count = 14, skinImages?: string[]) {
    if (!this.enabled || this.reducedMotion || !this.canvas) return;
    const colors = ['#a855f7', '#00f0ff', '#facc15', '#ec4899', '#38bdf8'];
    const validImages = skinImages && skinImages.length > 0 ? skinImages : undefined;
    if (validImages) {
      validImages.forEach((src) => this.getPreRenderedSprite(src));
    }

    const cappedCount = Math.min(18, count);
    for (let i = 0; i < cappedCount; i++) {
      const x = Math.random() * this.canvas.width;
      const y = -35 - Math.random() * 140;
      const chosenImg = validImages
        ? validImages[Math.floor(Math.random() * validImages.length)]
        : undefined;
      this.pushBounded({
        x,
        y,
        vx: (Math.random() - 0.5) * 2.0,
        vy: 3.8 + Math.random() * 4.0,
        size: chosenImg ? 18 + Math.random() * 8 : 10 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.92,
        decay: 0.006 + Math.random() * 0.004,
        rotation: 0,
        rotSpeed: 0,
        type: 'matthew_rain',
        gravity: 0.04,
        imageSrc: chosenImg,
      });
    }
  }

  private startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);

    const tick = () => {
      this.updateAndDraw();
      this.animId = requestAnimationFrame(tick);
    };
    this.animId = requestAnimationFrame(tick);
  }

  private updateAndDraw() {
    if (!this.ctx || !this.canvas) return;

    if (this.particles.length === 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'matthew_rain') {
        const sprite = p.imageSrc ? this.getPreRenderedSprite(p.imageSrc) : null;
        const r = p.size;
        if (sprite) {
          this.ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
        } else {
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          this.ctx.fillStyle = p.color;
          this.ctx.fill();
        }
      } else if (p.type === 'coin') {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      }
    }
    this.ctx.globalAlpha = 1.0;
  }

  public destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.particles = [];
  }
}

export const particleEngine = new ParticleSystem();

export const ParticleCanvas: React.FC<{ reducedMotion?: boolean; showParticles?: boolean }> = ({
  reducedMotion = false,
  showParticles = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    particleEngine.enabled = showParticles;
    particleEngine.reducedMotion = reducedMotion;
  }, [reducedMotion, showParticles]);

  useEffect(() => {
    if (canvasRef.current) {
      particleEngine.init(canvasRef.current);
    }

    const handleResize = () => {
      particleEngine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      particleEngine.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      style={{ display: showParticles ? 'block' : 'none' }}
    />
  );
};
