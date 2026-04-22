/**
 * app/icon.tsx — Next.js App Router dynamic favicon.
 * Gera um PNG 32×32: fundo azul (#4B5FE8) com letra E branca.
 * Substitui qualquer referência a /icon-e.svg — funciona em todos os browsers.
 */
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#4B5FE8",
          width: 32,
          height: 32,
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: "Arial, sans-serif",
          }}
        >
          E
        </span>
      </div>
    ),
    { width: 32, height: 32 },
  );
}
