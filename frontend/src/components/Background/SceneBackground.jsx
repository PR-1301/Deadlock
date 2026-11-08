import React, { useEffect, useRef } from 'react';

export default function SceneBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const glyphs = ['{', '}', '<', '/', '>', ';', '_', '0', '1'];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const count = window.innerWidth >= 1200 ? 54 : 36;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vy: 0.25 + Math.random() * 0.4,
      char: glyphs[Math.floor(Math.random() * glyphs.length)],
      size: Math.round(13 + Math.random() * 5),
      alpha: 0.07 + Math.random() * 0.05,
      isOrange: Math.random() > 0.45,
    }));

    let animId;
    const render = () => {
      if (!document.hidden && canvas) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = 'center';

        particles.forEach((p) => {
          p.y += p.vy;
          if (p.y > h + 20) {
            p.y = -10;
            p.x = Math.random() * w;
          }

          if (p.isOrange) {
            ctx.fillStyle = `rgba(245, 117, 70, ${p.alpha})`;
          } else {
            ctx.fillStyle = `rgba(249, 237, 210, ${p.alpha})`;
          }

          ctx.font = `${p.size}px 'JetBrains Mono', 'Fira Code', monospace`;
          ctx.fillText(p.char, p.x, p.y);
        });
      }
      animId = requestAnimationFrame(render);
    };

    render();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      aria-hidden="true"
    />
  );
}

