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
  type: 'coin' | 'spark' | 'star' | 'ember';
  gravity: number;
}

class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animId: number | null = null;
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

  public emitClick(x: number, y: number, isCrit: boolean, count = 12) {
    if (!this.enabled || this.reducedMotion) return;

    const actualCount = isCrit ? count * 2 : count;
    const colors = isCrit
      ? ['#00f0ff', '#ff007f', '#ffffff', '#ffd700']
      : ['#ffd700', '#ffaa00', '#00f0ff', '#ffffff'];

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (isCrit ? 5 : 3) + Math.random() * (isCrit ? 9 : 6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isCrit ? 4 : 2),
        size: isCrit ? 4 + Math.random() * 5 : 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.018 + Math.random() * 0.02,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        type: isCrit ? (Math.random() > 0.4 ? 'spark' : 'star') : (Math.random() > 0.5 ? 'coin' : 'star'),
        gravity: 0.22,
      });
    }
  }

  public emitPrestige() {
    if (!this.enabled || this.reducedMotion || !this.canvas) return;
    const colors = ['#00f0ff', '#9d4edd', '#ff007f', '#ffd700', '#ffffff'];
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * this.canvas.width;
      const y = this.canvas.height + 20;
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: -(8 + Math.random() * 14),
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.008 + Math.random() * 0.01,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        type: 'star',
        gravity: 0.08,
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

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.rotSpeed;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;

      if (p.type === 'coin') {
        // Draw little spinning gold coin
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      } else if (p.type === 'spark') {
        // Draw spark streak
        this.ctx.beginPath();
        this.ctx.moveTo(-p.size * 2, 0);
        this.ctx.lineTo(p.size * 2, 0);
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      } else {
        // Star particle
        const s = p.size;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -s);
        this.ctx.lineTo(s * 0.3, -s * 0.3);
        this.ctx.lineTo(s, 0);
        this.ctx.lineTo(s * 0.3, s * 0.3);
        this.ctx.lineTo(0, s);
        this.ctx.lineTo(-s * 0.3, s * 0.3);
        this.ctx.lineTo(-s, 0);
        this.ctx.lineTo(-s * 0.3, -s * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
      }

      this.ctx.restore();
    }
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
