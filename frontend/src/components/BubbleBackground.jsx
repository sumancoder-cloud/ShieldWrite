import { useEffect, useRef } from 'react';

const BUBBLE_COUNT = 18;
const COLORS = [
  'hsl(25, 95%, 55%)',
  'hsl(30, 88%, 48%)',
  'hsl(140, 50%, 38%)',
  'hsl(155, 45%, 30%)',
  'hsl(255, 20%, 40%)',
  'hsl(25, 70%, 45%)',
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function BubbleBackground({ intensity = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const bubblesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    bubblesRef.current = Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
      id: i,
      x: randomBetween(0.05, 0.95) * canvas.width,
      y: randomBetween(0.05, 0.95) * canvas.height,
      r: randomBetween(30, 120) * intensity,
      vx: randomBetween(-0.18, 0.18),
      vy: randomBetween(-0.22, 0.22),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: randomBetween(0.04, 0.14) * intensity,
      pulseSpeed: randomBetween(0.005, 0.015),
      pulsePhase: randomBetween(0, Math.PI * 2),
      time: randomBetween(0, 1000),
    }));

    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      bubblesRef.current.forEach((b) => {
        b.time += 0.008;
        b.x += b.vx;
        b.y += b.vy;

        if (b.x < -b.r) b.x = canvas.width + b.r;
        if (b.x > canvas.width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = canvas.height + b.r;
        if (b.y > canvas.height + b.r) b.y = -b.r;

        const pulseFactor = 1 + 0.08 * Math.sin(b.time * b.pulseSpeed * 200 + b.pulsePhase);
        const currentR = b.r * pulseFactor;
        const currentAlpha = b.alpha * (0.8 + 0.2 * Math.sin(b.time * b.pulseSpeed * 150));

        const grad = ctx.createRadialGradient(
          b.x - currentR * 0.3, b.y - currentR * 0.3, 0,
          b.x, b.y, currentR
        );
        grad.addColorStop(0, b.color.replace('hsl', 'hsla').replace(')', `, ${currentAlpha * 1.5})`));
        grad.addColorStop(0.4, b.color.replace('hsl', 'hsla').replace(')', `, ${currentAlpha})`));
        grad.addColorStop(1, b.color.replace('hsl', 'hsla').replace(')', ', 0)'));

        ctx.beginPath();
        ctx.arc(b.x, b.y, currentR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(b.x, b.y, currentR, 0, Math.PI * 2);
        ctx.strokeStyle = b.color.replace('hsl', 'hsla').replace(')', `, ${currentAlpha * 0.4})`);
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.9 }}
    />
  );
}
