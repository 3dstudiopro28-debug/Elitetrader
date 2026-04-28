"use client";

import { useEffect, useRef } from "react";

interface Props {
  opacity?: number;
}

export function NeuralNetworkBackground({ opacity = 0.45 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0,
      H = 0;
    let animId: number;
    let alive = true;

    function resize() {
      if (!canvas) return;
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    const mouse = { x: 0, y: 0, down: false };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onMouseDown = () => {
      mouse.down = true;
    };
    const onMouseUp = () => {
      mouse.down = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    const CONFIG = {
      particles: 130,
      centers: 6,
      maxDist: 140,
      mouseRadius: 180,
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      baseR: number;
      pulse: number;
      center: boolean;

      constructor(center = false) {
        this.center = center;
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.baseR = center ? 4 : 1.2;
        this.pulse = Math.random() * Math.PI * 2;
      }

      update() {
        this.pulse += 0.05;
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.mouseRadius) {
          const force = 1 - dist / CONFIG.mouseRadius;
          if (mouse.down) {
            this.vx -= dx * force * 0.02;
            this.vy -= dy * force * 0.02;
          } else {
            this.vx += dx * force * 0.002;
            this.vy += dy * force * 0.002;
          }
        }
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        const p = Math.sin(this.pulse) * 0.5 + 0.5;
        const glow = this.center ? 20 : 6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.baseR + p * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = this.center
          ? `rgba(255,255,255,0.85)`
          : `rgba(0,210,255,0.65)`;
        ctx.shadowBlur = glow;
        ctx.shadowColor = "#00f2ff";
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    let particles: Particle[] = [];

    function init() {
      particles = [];
      for (let i = 0; i < CONFIG.centers; i++)
        particles.push(new Particle(true));
      for (let i = 0; i < CONFIG.particles; i++) particles.push(new Particle());
    }

    function connect() {
      if (!ctx) return;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i],
            p2 = particles[j];
          const dx = p1.x - p2.x,
            dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONFIG.maxDist) {
            let alpha = 1 - dist / CONFIG.maxDist;
            const mx = (p1.x + p2.x) / 2 - mouse.x;
            const my = (p1.y + p2.y) / 2 - mouse.y;
            const md = Math.sqrt(mx * mx + my * my);
            if (md < CONFIG.mouseRadius) alpha += 0.3;
            ctx.strokeStyle = `rgba(0,210,255,${alpha * 0.4})`;
            ctx.lineWidth = p1.center || p2.center ? 1.5 : 0.7;
            ctx.beginPath();
            const cx = (p1.x + p2.x) / 2 + Math.sin(p1.pulse) * 15;
            const cy = (p1.y + p2.y) / 2 + Math.cos(p2.pulse) * 15;
            ctx.moveTo(p1.x, p1.y);
            ctx.quadraticCurveTo(cx, cy, p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }

    function drawMouseAura() {
      if (!ctx) return;
      const grad = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        CONFIG.mouseRadius,
      );
      grad.addColorStop(0, "rgba(0,242,255,0.12)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, CONFIG.mouseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    function loop() {
      if (!ctx || !alive) return;
      // trail com cor que combina com o fundo escuro da página
      ctx.fillStyle = "rgba(10,14,39,0.22)";
      ctx.fillRect(0, 0, W, H);
      drawMouseAura();
      connect();
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animId = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(canvas);
    resize();
    init();
    loop();

    return () => {
      alive = false;
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        opacity,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
