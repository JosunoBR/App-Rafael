import React, { useEffect, useRef } from 'react';

interface StoreConfettiProps {
  isVisible: boolean;
  onAnimationEnd?: () => void;
  durationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
}

export const StoreConfetti: React.FC<StoreConfettiProps> = ({
  isVisible,
  onAnimationEnd,
  durationMs = 3500
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajusta o tamanho do canvas para o tamanho da janela
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Cores fiéis a ConfettiEffect.kt do App Erica
    const colors = [
      '#10B981', // Verde esmeralda
      '#3B82F6', // Azul
      '#F59E0B', // Dourado SuperMeta
      '#EC4899', // Rosa
      '#8B5CF6', // Roxo
      '#FBBF24', // Amarelo sol
      '#14B8A6'  // Teal
    ];

    // Gera 70 partículas conforme ConfettiEffect.kt (linha 42)
    const particleCount = 80;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height * 0.5,
        speed: Math.random() * 3 + 2.5,
        size: Math.random() * 10 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        wobble: Math.random() * 10,
        wobbleSpeed: Math.random() * 0.1 + 0.05
      });
    }

    let animationFrameId: number;
    const startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > durationMs) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (onAnimationEnd) onAnimationEnd();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.y += p.speed;
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;
        const xOffset = Math.sin(p.wobble) * 2;

        ctx.save();
        ctx.translate(p.x + xOffset, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        ctx.fillStyle = p.color;
        // Desenha retângulo com aspecto de papel picado
        ctx.fillRect(-p.size / 2, (-p.size * 0.6) / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateSize);
    };
  }, [isVisible, durationMs, onAnimationEnd]);

  if (!isVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
