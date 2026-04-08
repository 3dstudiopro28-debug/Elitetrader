// components/TradingChart.tsx

import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  CandlestickSeries,
} from "lightweight-charts";
import React, { useEffect, useRef } from "react";

// Props que o nosso componente vai aceitar. Por agora, apenas os dados do gráfico.
export interface TradingChartProps {
  data: CandlestickData[];
}

// Dados de exemplo, caso não sejam fornecidos nenhuns.
const initialData: CandlestickData[] = [
  {
    open: 178.53,
    high: 179.35,
    low: 178.23,
    close: 179.23,
    time: "2024-03-01",
  },
  {
    open: 179.48,
    high: 180.53,
    low: 179.38,
    close: 180.52,
    time: "2024-03-02",
  },
  {
    open: 180.52,
    high: 181.18,
    low: 179.92,
    close: 180.28,
    time: "2024-03-03",
  },
  {
    open: 180.21,
    high: 180.68,
    low: 178.54,
    close: 179.31,
    time: "2024-03-04",
  },
  {
    open: 179.09,
    high: 180.48,
    low: 178.61,
    close: 180.13,
    time: "2024-03-05",
  },
];

const TradingChart: React.FC<TradingChartProps> = ({ data = initialData }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Cria o gráfico apenas uma vez
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 500, // Pode ajustar a altura
        layout: {
          background: { type: ColorType.Solid, color: "#161a25" }, // Cor de fundo escura
          textColor: "rgba(255, 255, 255, 0.9)",
        },
        grid: {
          vertLines: { color: "#334158" },
          horzLines: { color: "#334158" },
        },
        timeScale: {
          borderColor: "#485c7b",
        },
      });

      seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderDownColor: "#ef5350",
        borderUpColor: "#26a69a",
        wickDownColor: "#ef5350",
        wickUpColor: "#26a69a",
      });
    }

    // Define os dados no gráfico
    seriesRef.current?.setData(data);
    chartRef.current.timeScale().fitContent();

    // Lida com o redimensionamento da janela
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.resize(chartContainerRef.current.clientWidth, 500);
      }
    };

    window.addEventListener("resize", handleResize);

    // Limpeza ao desmontar o componente
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data]); // O useEffect corre novamente se os dados mudarem

  return <div ref={chartContainerRef} style={{ position: "relative" }} />;
};

export default TradingChart;
