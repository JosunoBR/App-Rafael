import React, { useEffect, useRef } from 'react';

/**
 * Partículas flutuantes da barra de progresso (Flow Particles)
 * Reprodução fiel da animação de Canvas do App Erica (EvolutionProgressBar.kt)
 * 12 partículas dinâmicas brancas translúcidas flutuando suavemente em loop contínuo
 */
export const StoreProgressBarParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particleProgress = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
        }
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height);

        // Avanço contínuo equivalente ao tween(2000, LinearEasing) do Jetpack Compose
        particleProgress = (particleProgress + 0.005) % 1;

        // Desenha exatamente as 12 partículas com a fórmula original do Compose
        for (let i = 0; i < 12; i++) {
          const xPos = width * ((particleProgress + i / 12) % 1);
          const yPos = ((i * 137) % 100) / 100 * height;
          const radius = (i % 4) + 2;

          ctx.beginPath();
          ctx.arc(xPos, yPos, radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};
