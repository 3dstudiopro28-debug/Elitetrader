"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { NeuralNetworkBackground } from "@/components/NeuralNetworkBackground";

// ─── Dot pulse loader ─────────────────────────────────────────────────────────
function PulseDots() {
  return (
    <span style={{ display: "inline-flex", gap: "4px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            background: "#4a90e2",
            borderRadius: "50%",
            display: "inline-block",
            animation: "dotBlink 1.5s ease-in-out infinite",
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </span>
  );
}

// ─── Barra de progresso animada ───────────────────────────────────────────────
function AnimatedBar() {
  return (
    <div
      style={{
        width: "100%",
        height: 4,
        background: "rgba(74,144,226,0.1)",
        borderRadius: 2,
        overflow: "hidden",
        marginTop: 6,
      }}
    >
      <div
        style={{
          height: "100%",
          background: "linear-gradient(90deg, #4a90e2, #6ba3f5)",
          borderRadius: 2,
          boxShadow: "0 0 8px rgba(74,144,226,0.5)",
          animation: "dataReading 4s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ─── Status dot ───────────────────────────────────────────────────────────────
function StatusDot({ type }: { type: "active" | "loading" }) {
  return (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-block",
        background: type === "active" ? "#4ade80" : "#fbbf24",
        animation:
          type === "active"
            ? "pulseGreen 2s ease-in-out infinite"
            : "pulseYellow 1.2s ease-in-out infinite",
      }}
    />
  );
}

export default function RobotPage() {
  const [serial, setSerial] = useState("");
  const [status, setStatus] = useState<"idle" | "invalid">("idle");
  const [robotHovered, setRobotHovered] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);

  // Buscar telefone do registo do utilizador (profiles.phone)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return;
      supabase
        .from("profiles")
        .select("phone")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          // Guardar o valor mesmo vazio para distinguir "carregou" de "a carregar"
          setUserPhone(
            typeof data?.phone === "string" ? data.phone.trim() || "" : "",
          );
        })
        .catch(() => setUserPhone(""));
    });
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
      <style>{`
        @keyframes dotBlink {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes dataReading {
          0%   { width: 0%; }
          25%  { width: 35%; }
          50%  { width: 70%; }
          75%  { width: 45%; }
          100% { width: 0%; }
        }
        @keyframes pulseGreen {
          0%, 100% { box-shadow: 0 0 4px rgba(74,212,128,0.4); }
          50%       { box-shadow: 0 0 12px rgba(74,212,128,0.8); }
        }
        @keyframes pulseYellow {
          0%, 100% { box-shadow: 0 0 4px rgba(251,191,36,0.4); }
          50%       { box-shadow: 0 0 12px rgba(251,191,36,0.8); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .serial-input-style {
          flex: 1;
          background: rgba(74,144,226,0.08);
          border: 1px solid rgba(74,144,226,0.3);
          border-radius: 8px;
          padding: 12px 14px;
          color: #fff;
          font-size: 13px;
          font-family: Courier New, monospace;
          letter-spacing: 1px;
          transition: all 0.3s ease;
          outline: none;
        }
        .serial-input-style::placeholder { color: rgba(74,144,226,0.4); }
        .serial-input-style:focus {
          background: rgba(74,144,226,0.12);
          border-color: rgba(74,144,226,0.6);
          box-shadow: 0 0 12px rgba(74,144,226,0.2);
        }
        .serial-input-invalid {
          background: rgba(239,68,68,0.1) !important;
          border-color: rgba(239,68,68,0.6) !important;
          animation: shakeX 0.5s ease;
        }
        .activate-btn-style {
          width: 100%;
          background: linear-gradient(135deg, #4a90e2, #6ba3f5);
          border: 1px solid rgba(74,144,226,0.6);
          border-radius: 8px;
          padding: 12px 20px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(74,144,226,0.25);
          transition: all 0.3s ease;
        }
        .activate-btn-style:hover {
          background: linear-gradient(135deg, #6ba3f5, #8bb8ff);
          box-shadow: 0 6px 16px rgba(74,144,226,0.38);
          transform: translateY(-2px);
        }
        .activate-btn-style:active { transform: translateY(0); }
        .status-item-hover { transition: border-color 0.3s ease, background 0.3s ease; }
        .status-item-hover:hover {
          border-color: rgba(74,144,226,0.35) !important;
          background: rgba(74,144,226,0.08) !important;
        }
        @media (max-width: 768px) {
          .main-grid-r { grid-template-columns: 1fr !important; }
          .robot-section-r { min-height: 300px !important; }
          .robot-icon-r { width: 140px !important; height: 140px !important; }
          .page-title-r { font-size: 24px !important; }
        }
      `}</style>

      <div
        style={{
          position: "relative",
          background: "transparent",
          minHeight: "100%",
          padding: "24px 20px",
          color: "#e0e0e0",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
          overflow: "hidden",
        }}
      >
        <NeuralNetworkBackground opacity={0.45} />
        <div
          id="app"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* HEADER */}
          <div style={{ marginBottom: 40 }}>
            <h1
              className="page-title-r"
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: "#fff",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 4,
                  height: 28,
                  background: "#4a90e2",
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              Análise I.A.
            </h1>
            <p style={{ color: "#8b92a9", fontSize: 14 }}>
              Sistema de análise em tempo real com sinais técnicos avançados
            </p>
          </div>

          {/* MAIN GRID */}
          <div
            className="main-grid-r"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 30,
              marginBottom: 40,
            }}
          >
            {/* LEFT — Robot Section */}
            <div
              className="robot-section-r"
              style={{
                background:
                  "linear-gradient(135deg, rgba(10,15,40,0.92), rgba(8,13,35,0.95))",
                border: "1px solid rgba(74,144,226,0.2)",
                borderRadius: 12,
                padding: "40px 30px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 400,
              }}
              onMouseEnter={() => setRobotHovered(true)}
              onMouseLeave={() => setRobotHovered(false)}
            >
              <div
                className="robot-icon-r"
                style={{
                  width: 200,
                  height: 200,
                  marginBottom: 30,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  src="/robot_ai_icon.png"
                  alt="Elite-IA"
                  width={200}
                  height={200}
                  style={{
                    objectFit: "contain",
                    userSelect: "none",
                    filter: robotHovered
                      ? "drop-shadow(0 0 30px rgba(74,144,226,0.55)) brightness(1.06)"
                      : "drop-shadow(0 0 20px rgba(74,144,226,0.3))",
                    transition: "filter 0.3s ease",
                  }}
                  priority
                />
              </div>
              <div
                style={{
                  marginTop: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#4a90e2",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                Elite-IA <PulseDots />
              </div>
              <p
                style={{
                  color: "#8b92a9",
                  fontSize: 13,
                  marginTop: 12,
                  lineHeight: 1.5,
                }}
              >
                Motor de inteligência artificial · v2.4.1
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 20,
                }}
              >
                {["⚡ Alta Frequência", "📊 Tempo Real", "🛡️ Protegido"].map(
                  (label) => (
                    <span
                      key={label}
                      style={{
                        background: "rgba(74,144,226,0.1)",
                        border: "1px solid rgba(74,144,226,0.25)",
                        color: "#6ba3f5",
                        borderRadius: 20,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* RIGHT — Activation Panel */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(10,15,40,0.92), rgba(8,13,35,0.95))",
                border: "1px solid rgba(74,144,226,0.2)",
                borderRadius: 12,
                padding: 30,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Panel header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "rgba(74,144,226,0.2)",
                    border: "1px solid rgba(74,144,226,0.5)",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: 18,
                  }}
                >
                  🤖
                </div>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#fff",
                    letterSpacing: "0.5px",
                    flex: 1,
                  }}
                >
                  Painel de Activação
                </span>
                <PulseDots />
              </div>

              {/* Serial input */}
              <div>
                <label
                  style={{
                    display: "block",
                    color: "#4a90e2",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 8,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Número de Série / Token
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    value={serial}
                    onChange={handleSerialChange}
                    onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                    placeholder="XXXX-XXXX-XXXX"
                    className={
                      "serial-input-style" +
                      (isInvalid ? " serial-input-invalid" : "")
                    }
                  />
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: "rgba(74,144,226,0.1)",
                      border: "1px solid rgba(74,144,226,0.3)",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    🔒
                  </div>
                </div>
                {isInvalid && (
                  <div
                    style={{
                      marginTop: 8,
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.35)",
                      color: "#f87171",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      animation: "fadeInUp 0.25s ease",
                    }}
                  >
                    <span>✕</span> Token Inválido — Número de série não
                    reconhecido
                  </div>
                )}
              </div>

              {/* Contacto de notificações Elite-IA */}
              <div
                style={{
                  background: "rgba(74,144,226,0.06)",
                  border: "1px solid rgba(74,144,226,0.2)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "rgba(74,144,226,0.15)",
                    border: "1px solid rgba(74,144,226,0.4)",
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  📱
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: "#4a90e2",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Receba também por Mensagens Elite‑IA
                  </p>
                  {userPhone === null ? (
                    /* A carregar */
                    <p style={{ color: "rgba(74,144,226,0.4)", fontSize: 12 }}>
                      <PulseDots />
                    </p>
                  ) : userPhone === "" ? (
                    /* Registou-se sem número */
                    <p
                      style={{
                        color: "rgba(74,144,226,0.45)",
                        fontSize: 12,
                        fontStyle: "italic",
                      }}
                    >
                      Sem contacto registado
                    </p>
                  ) : (
                    /* Número do registo */
                    <p
                      style={{
                        color: "#e0e0e0",
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "Courier New, monospace",
                        letterSpacing: 1,
                      }}
                    >
                      {userPhone}
                    </p>
                  )}
                  <p style={{ color: "#8b92a9", fontSize: 11, marginTop: 3 }}>
                    Número que irá receber todas as informações e sinais da IA
                  </p>
                </div>
              </div>

              {/* Activate button */}
              <button className="activate-btn-style" onClick={handleActivate}>
                <span>⚡</span>
                <span>ATIVAR SISTEMA</span>
              </button>

              {/* Status */}
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#4a90e2",
                    marginBottom: 15,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Status do Sistema
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {[
                    {
                      emoji: "📡",
                      label: "Conexão com Servidor",
                      type: "active" as const,
                      bar: false,
                    },
                    {
                      emoji: "🔄",
                      label: "Leitura de Dados do Mercado",
                      type: "loading" as const,
                      bar: true,
                    },
                    {
                      emoji: "🧠",
                      label: "Motor de IA Pronto",
                      type: "active" as const,
                      bar: false,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="status-item-hover"
                      style={{
                        background: "rgba(74,144,226,0.05)",
                        border: "1px solid rgba(74,144,226,0.15)",
                        borderRadius: 8,
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          background: "rgba(74,144,226,0.15)",
                          border: "1px solid rgba(74,144,226,0.4)",
                          borderRadius: 6,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {item.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            color: "#e0e0e0",
                            fontSize: 13,
                            fontWeight: 500,
                            margin: 0,
                          }}
                        >
                          {item.label}
                        </p>
                        {item.bar && <AnimatedBar />}
                      </div>
                      <StatusDot type={item.type} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* INFO CARDS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                emoji: "📈",
                title: "Análise Técnica",
                desc: "Indicadores RSI, MACD, Bandas de Bollinger e mais de 20 sinais automáticos.",
              },
              {
                emoji: "⚡",
                title: "Execução Rápida",
                desc: "Ordens executadas em milissegundos com gestão de risco integrada.",
              },
              {
                emoji: "🛡️",
                title: "Proteção Avançada",
                desc: "Stop-loss dinâmico e controlo de drawdown para proteger o seu capital.",
              },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  background:
                    "linear-gradient(135deg, rgba(10,15,40,0.92), rgba(8,13,35,0.95))",
                  border: "1px solid rgba(74,144,226,0.15)",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "rgba(74,144,226,0.12)",
                    border: "1px solid rgba(74,144,226,0.3)",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: 18,
                    marginBottom: 12,
                  }}
                >
                  {card.emoji}
                </div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#fff",
                    marginBottom: 6,
                  }}
                >
                  {card.title}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#8b92a9",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
