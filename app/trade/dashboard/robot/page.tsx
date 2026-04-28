"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Bot,
  Lock,
  Activity,
  Wifi,
  Cpu,
  Shield,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Imagem Robô Elite-IA ────────────────────────────────────────────────────
function RobotImage({ animated }: { animated: boolean }) {
  return (
    <Image
      src="/robot_ai_icon.png"
      alt="Elite-IA"
      width={220}
      height={220}
      className="object-contain select-none w-full h-full"
      style={{
        filter: animated
          ? "drop-shadow(0 0 30px rgba(74,144,226,0.85)) brightness(1.08)"
          : "drop-shadow(0 0 12px rgba(74,144,226,0.3))",
        transition: "filter 0.4s ease",
      }}
      priority
    />
  );
}

// ─── SVG Robô Elite-IA (mantido mas não usado) ───────────────────────────────
function RobotSVG({ animated }: { animated: boolean }) {
  return (
    <svg
      viewBox="0 0 200 220"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      style={{
        filter: animated
          ? "drop-shadow(0 0 28px rgba(74,144,226,0.55))"
          : "drop-shadow(0 0 14px rgba(74,144,226,0.25))",
        transition: "filter 0.4s ease",
      }}
    >
      {/* Antenna */}
      <line
        x1="100"
        y1="10"
        x2="100"
        y2="32"
        stroke="#4a90e2"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="100" cy="7" r="5" fill="#4a90e2">
        {animated && (
          <animate
            attributeName="r"
            values="5;7;5"
            dur="1.4s"
            repeatCount="indefinite"
          />
        )}
        {animated && (
          <animate
            attributeName="opacity"
            values="1;0.5;1"
            dur="1.4s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      {/* Head */}
      <rect
        x="56"
        y="32"
        width="88"
        height="70"
        rx="14"
        ry="14"
        fill="url(#headGrad)"
        stroke="rgba(74,144,226,0.6)"
        strokeWidth="1.5"
      />

      {/* Eyes */}
      <rect x="70" y="48" width="22" height="18" rx="5" fill="#0a0e27" />
      <rect x="108" y="48" width="22" height="18" rx="5" fill="#0a0e27" />
      {/* Eye glow */}
      <rect
        x="70"
        y="48"
        width="22"
        height="18"
        rx="5"
        fill="rgba(74,144,226,0.18)"
      />
      <rect
        x="108"
        y="48"
        width="22"
        height="18"
        rx="5"
        fill="rgba(74,144,226,0.18)"
      />
      <ellipse cx="81" cy="57" rx="6" ry="5" fill="#4a90e2">
        {animated && (
          <animate
            attributeName="fill"
            values="#4a90e2;#8bb8ff;#4a90e2"
            dur="2.5s"
            repeatCount="indefinite"
          />
        )}
      </ellipse>
      <ellipse cx="119" cy="57" rx="6" ry="5" fill="#4a90e2">
        {animated && (
          <animate
            attributeName="fill"
            values="#4a90e2;#8bb8ff;#4a90e2"
            dur="2.5s"
            repeatCount="indefinite"
          />
        )}
      </ellipse>
      {/* Eye shine */}
      <circle cx="84" cy="54" r="2" fill="rgba(255,255,255,0.6)" />
      <circle cx="122" cy="54" r="2" fill="rgba(255,255,255,0.6)" />

      {/* Mouth */}
      <rect x="74" y="80" width="52" height="10" rx="5" fill="#0a0e27" />
      <rect
        x="76"
        y="82"
        width="10"
        height="6"
        rx="3"
        fill="#4a90e2"
        opacity="0.8"
      >
        {animated && (
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur="0.9s"
            repeatCount="indefinite"
          />
        )}
      </rect>
      <rect
        x="89"
        y="82"
        width="10"
        height="6"
        rx="3"
        fill="#4a90e2"
        opacity="0.5"
      >
        {animated && (
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur="0.9s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        )}
      </rect>
      <rect
        x="102"
        y="82"
        width="10"
        height="6"
        rx="3"
        fill="#4a90e2"
        opacity="0.8"
      >
        {animated && (
          <animate
            attributeName="opacity"
            values="0.8;0.2;0.8"
            dur="0.9s"
            begin="0.6s"
            repeatCount="indefinite"
          />
        )}
      </rect>
      <rect
        x="115"
        y="82"
        width="9"
        height="6"
        rx="3"
        fill="#4a90e2"
        opacity="0.6"
      >
        {animated && (
          <animate
            attributeName="opacity"
            values="0.6;1;0.6"
            dur="0.9s"
            begin="0.15s"
            repeatCount="indefinite"
          />
        )}
      </rect>

      {/* Neck */}
      <rect
        x="90"
        y="102"
        width="20"
        height="12"
        rx="4"
        fill="rgba(74,144,226,0.3)"
        stroke="rgba(74,144,226,0.4)"
        strokeWidth="1"
      />

      {/* Body */}
      <rect
        x="42"
        y="114"
        width="116"
        height="78"
        rx="14"
        ry="14"
        fill="url(#bodyGrad)"
        stroke="rgba(74,144,226,0.5)"
        strokeWidth="1.5"
      />

      {/* Chest panel */}
      <rect
        x="60"
        y="124"
        width="80"
        height="48"
        rx="8"
        fill="rgba(10,14,39,0.7)"
        stroke="rgba(74,144,226,0.3)"
        strokeWidth="1"
      />
      {/* Chest bars */}
      <rect
        x="68"
        y="132"
        width="64"
        height="5"
        rx="2.5"
        fill="rgba(74,144,226,0.15)"
      />
      <rect
        x="68"
        y="132"
        width="30"
        height="5"
        rx="2.5"
        fill="#4a90e2"
        opacity="0.7"
      >
        {animated && (
          <animate
            attributeName="width"
            values="30;60;30"
            dur="2.2s"
            repeatCount="indefinite"
          />
        )}
      </rect>
      <rect
        x="68"
        y="142"
        width="64"
        height="5"
        rx="2.5"
        fill="rgba(74,144,226,0.15)"
      />
      <rect
        x="68"
        y="142"
        width="50"
        height="5"
        rx="2.5"
        fill="#6ba3f5"
        opacity="0.6"
      >
        {animated && (
          <animate
            attributeName="width"
            values="50;20;50"
            dur="1.8s"
            repeatCount="indefinite"
          />
        )}
      </rect>
      <rect
        x="68"
        y="152"
        width="64"
        height="5"
        rx="2.5"
        fill="rgba(74,144,226,0.15)"
      />
      <rect
        x="68"
        y="152"
        width="45"
        height="5"
        rx="2.5"
        fill="#4a90e2"
        opacity="0.5"
      >
        {animated && (
          <animate
            attributeName="width"
            values="45;64;45"
            dur="2.8s"
            repeatCount="indefinite"
          />
        )}
      </rect>

      {/* Core circle */}
      <circle
        cx="100"
        cy="164"
        r="9"
        fill="rgba(74,144,226,0.15)"
        stroke="rgba(74,144,226,0.5)"
        strokeWidth="1.5"
      />
      <circle cx="100" cy="164" r="5" fill="#4a90e2">
        {animated && (
          <animate
            attributeName="r"
            values="5;7;5"
            dur="1.5s"
            repeatCount="indefinite"
          />
        )}
        {animated && (
          <animate
            attributeName="opacity"
            values="1;0.6;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      {/* Arms */}
      <rect
        x="14"
        y="118"
        width="28"
        height="52"
        rx="10"
        fill="url(#armGrad)"
        stroke="rgba(74,144,226,0.4)"
        strokeWidth="1"
      />
      <rect
        x="158"
        y="118"
        width="28"
        height="52"
        rx="10"
        fill="url(#armGrad)"
        stroke="rgba(74,144,226,0.4)"
        strokeWidth="1"
      />
      {/* Arm joints */}
      <circle
        cx="28"
        cy="132"
        r="5"
        fill="rgba(74,144,226,0.3)"
        stroke="rgba(74,144,226,0.5)"
        strokeWidth="1"
      />
      <circle
        cx="172"
        cy="132"
        r="5"
        fill="rgba(74,144,226,0.3)"
        stroke="rgba(74,144,226,0.5)"
        strokeWidth="1"
      />

      {/* Legs */}
      <rect
        x="62"
        y="192"
        width="28"
        height="22"
        rx="8"
        fill="url(#legGrad)"
        stroke="rgba(74,144,226,0.4)"
        strokeWidth="1"
      />
      <rect
        x="110"
        y="192"
        width="28"
        height="22"
        rx="8"
        fill="url(#legGrad)"
        stroke="rgba(74,144,226,0.4)"
        strokeWidth="1"
      />

      {/* Gradients */}
      <defs>
        <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(74,144,226,0.18)" />
          <stop offset="100%" stopColor="rgba(26,77,158,0.12)" />
        </linearGradient>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(74,144,226,0.15)" />
          <stop offset="100%" stopColor="rgba(26,77,158,0.10)" />
        </linearGradient>
        <linearGradient id="armGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(74,144,226,0.12)" />
          <stop offset="100%" stopColor="rgba(26,77,158,0.08)" />
        </linearGradient>
        <linearGradient id="legGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(74,144,226,0.15)" />
          <stop offset="100%" stopColor="rgba(26,77,158,0.08)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Dot pulse loader ─────────────────────────────────────────────────────────
function PulseDots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#4a90e2]"
          style={{
            animation: `dotBlink 1.5s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </span>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function AnimatedBar({ delay = "0s" }: { delay?: string }) {
  return (
    <div className="w-full h-1 rounded-full bg-[rgba(74,144,226,0.1)] overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#4a90e2] to-[#6ba3f5]"
        style={{
          boxShadow: "0 0 8px rgba(74,144,226,0.5)",
          animation: `dataReading 4s ease-in-out infinite`,
          animationDelay: delay,
        }}
      />
    </div>
  );
}

export default function RobotPage() {
  const [serial, setSerial] = useState("");
  const [status, setStatus] = useState<"idle" | "invalid">("idle");
  const [robotHovered, setRobotHovered] = useState(false);
  const [tick, setTick] = useState(0);

  // Contador de tick para animação de colunas
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(iv);
  }, []);

  function handleActivate() {
    if (!serial.trim()) return;
    setStatus("invalid");
    setTimeout(() => setStatus("idle"), 4000);
  }

  function handleSerialChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setSerial(raw.slice(0, 16));
    if (status === "invalid") setStatus("idle");
  }

  const isInvalid = status === "invalid";

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes dotBlink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes dataReading {
          0%   { width: 0%; }
          25%  { width: 35%; }
          50%  { width: 72%; }
          75%  { width: 44%; }
          100% { width: 0%; }
        }
        @keyframes pulseGreen {
          0%, 100% { box-shadow: 0 0 4px rgba(74, 212, 128, 0.4); }
          50% { box-shadow: 0 0 12px rgba(74, 212, 128, 0.9); }
        }
        @keyframes pulseYellow {
          0%, 100% { box-shadow: 0 0 4px rgba(251, 191, 36, 0.4); }
          50% { box-shadow: 0 0 12px rgba(251, 191, 36, 0.9); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="min-h-full p-4 md:p-6 space-y-6">
        {/* ── Header ──────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground flex items-center gap-3">
            <span
              className="inline-block w-1 h-7 rounded-full"
              style={{ background: "#4a90e2" }}
            />
            <Bot className="w-7 h-7" style={{ color: "#4a90e2" }} />
            Elite‑IA
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8b92a9" }}>
            Sistema autónomo de análise e execução com inteligência artificial
          </p>
        </div>

        {/* ── Main Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT — Robot visual */}
          <div
            className="rounded-2xl flex flex-col items-center justify-center p-8 min-h-[380px] text-center cursor-default"
            style={{
              background:
                "linear-gradient(135deg, rgba(74,144,226,0.06), rgba(26,77,158,0.06))",
              border: "1px solid rgba(74,144,226,0.2)",
            }}
            onMouseEnter={() => setRobotHovered(true)}
            onMouseLeave={() => setRobotHovered(false)}
          >
            <div className="w-48 h-48 select-none">
              <RobotImage animated={robotHovered} />
            </div>

            <div className="mt-6 flex items-center gap-2">
              <span
                className="text-base font-semibold"
                style={{ color: "#4a90e2" }}
              >
                Elite‑IA
              </span>
              <PulseDots />
            </div>
            <p className="text-xs mt-2" style={{ color: "#8b92a9" }}>
              Motor de inteligência artificial · v2.4.1
            </p>

            {/* Spec chips */}
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {[
                { icon: <Zap className="w-3 h-3" />, label: "Alta Frequência" },
                { icon: <Activity className="w-3 h-3" />, label: "Tempo Real" },
                { icon: <Shield className="w-3 h-3" />, label: "Protegido" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{
                    background: "rgba(74,144,226,0.1)",
                    border: "1px solid rgba(74,144,226,0.25)",
                    color: "#6ba3f5",
                  }}
                >
                  {chip.icon}
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT — Activation panel */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-5"
            style={{
              background:
                "linear-gradient(135deg, rgba(74,144,226,0.05), rgba(26,77,158,0.05))",
              border: "1px solid rgba(74,144,226,0.2)",
            }}
          >
            {/* Panel header */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(74,144,226,0.15)",
                  border: "1px solid rgba(74,144,226,0.4)",
                }}
              >
                <Cpu className="w-4 h-4" style={{ color: "#4a90e2" }} />
              </div>
              <span className="text-sm font-semibold text-foreground flex-1">
                Painel de Activação
              </span>
              <PulseDots />
            </div>

            {/* Serial input */}
            <div className="space-y-2">
              <label
                className="block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "#4a90e2" }}
              >
                Número de Série / Token
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={serial}
                  onChange={handleSerialChange}
                  placeholder="XXXX-XXXX-XXXX"
                  className={cn(
                    "flex-1 rounded-lg px-3 py-3 text-sm font-mono tracking-widest text-white placeholder:text-[rgba(74,144,226,0.35)] outline-none transition-all duration-200",
                    isInvalid
                      ? "bg-red-500/10 border border-red-500/60 focus:border-red-400"
                      : "focus:border-[rgba(74,144,226,0.6)] focus:shadow-[0_0_12px_rgba(74,144,226,0.2)]",
                  )}
                  style={
                    !isInvalid
                      ? {
                          background: "rgba(74,144,226,0.08)",
                          border: "1px solid rgba(74,144,226,0.3)",
                          animation: undefined,
                        }
                      : {
                          animation: "shakeX 0.5s ease",
                        }
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                />
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(74,144,226,0.1)",
                    border: "1px solid rgba(74,144,226,0.3)",
                    color: "#4a90e2",
                  }}
                >
                  <Lock className="w-4 h-4" />
                </div>
              </div>

              {/* Error message */}
              {isInvalid && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    color: "#f87171",
                    animation: "fadeInUp 0.25s ease",
                  }}
                >
                  <span className="text-base leading-none">✕</span>
                  Token Inválido · NS Invalid — Série não reconhecida
                </div>
              )}
            </div>

            {/* Activate button */}
            <button
              onClick={handleActivate}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white tracking-wide flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: "linear-gradient(135deg, #4a90e2, #6ba3f5)",
                border: "1px solid rgba(74,144,226,0.6)",
                boxShadow: "0 4px 14px rgba(74,144,226,0.25)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 6px 18px rgba(74,144,226,0.4)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(74,144,226,0.25)")
              }
            >
              <Zap className="w-4 h-4" />
              ATIVAR SISTEMA
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* System status */}
            <div className="space-y-3">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "#4a90e2" }}
              >
                Status do Sistema
              </p>

              {/* Conexão */}
              <div
                className="flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 hover:border-[rgba(74,144,226,0.35)]"
                style={{
                  background: "rgba(74,144,226,0.05)",
                  border: "1px solid rgba(74,144,226,0.15)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(74,144,226,0.12)",
                    border: "1px solid rgba(74,144,226,0.3)",
                  }}
                >
                  <Wifi className="w-4 h-4" style={{ color: "#4a90e2" }} />
                </div>
                <div className="flex-1 text-xs font-medium text-foreground/80">
                  Conexão com Servidor
                </div>
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background: "#4ade80",
                    animation: "pulseGreen 2s ease-in-out infinite",
                  }}
                />
              </div>

              {/* Leitura de dados */}
              <div
                className="flex items-center gap-3 rounded-lg px-3 py-3"
                style={{
                  background: "rgba(74,144,226,0.05)",
                  border: "1px solid rgba(74,144,226,0.15)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(74,144,226,0.12)",
                    border: "1px solid rgba(74,144,226,0.3)",
                  }}
                >
                  <Activity className="w-4 h-4" style={{ color: "#4a90e2" }} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-xs font-medium text-foreground/80">
                    Leitura de Dados do Mercado
                  </p>
                  <AnimatedBar />
                </div>
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background: "#fbbf24",
                    animation: "pulseYellow 1.2s ease-in-out infinite",
                  }}
                />
              </div>

              {/* Motor IA */}
              <div
                className="flex items-center gap-3 rounded-lg px-3 py-3"
                style={{
                  background: "rgba(74,144,226,0.05)",
                  border: "1px solid rgba(74,144,226,0.15)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(74,144,226,0.12)",
                    border: "1px solid rgba(74,144,226,0.3)",
                  }}
                >
                  <Cpu className="w-4 h-4" style={{ color: "#4a90e2" }} />
                </div>
                <div className="flex-1 text-xs font-medium text-foreground/80">
                  Motor de IA Pronto
                </div>
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background: "#4ade80",
                    animation: "pulseGreen 2s ease-in-out infinite",
                    animationDelay: "0.5s",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Info cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: (
                <Activity className="w-5 h-5" style={{ color: "#4a90e2" }} />
              ),
              title: "Análise Técnica",
              desc: "Indicadores RSI, MACD, Bandas de Bollinger e mais de 20 sinais automáticos.",
            },
            {
              icon: <Zap className="w-5 h-5" style={{ color: "#4a90e2" }} />,
              title: "Execução Rápida",
              desc: "Ordens executadas em milissegundos com gestão de risco integrada.",
            },
            {
              icon: <Shield className="w-5 h-5" style={{ color: "#4a90e2" }} />,
              title: "Proteção Avançada",
              desc: "Stop-loss dinâmico e controlo de drawdown para proteger o seu capital.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl p-5 space-y-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(74,144,226,0.05), rgba(26,77,158,0.05))",
                border: "1px solid rgba(74,144,226,0.15)",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: "rgba(74,144,226,0.12)",
                  border: "1px solid rgba(74,144,226,0.3)",
                }}
              >
                {card.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {card.title}
                </p>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: "#8b92a9" }}
                >
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
