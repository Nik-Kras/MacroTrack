import React from "react";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { colors, font } from "@/theme";

// Calorie ring: shows kcal left (or over).
export function Ring({ cur, tgt, acc }: { cur: number; tgt: number; acc: string }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const pct = Math.min(cur / tgt, 1);
  const left = Math.max(tgt - cur, 0);
  const over = cur > tgt;
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={R} fill="none" stroke={colors.track} strokeWidth={11} />
      <Circle
        cx={60}
        cy={60}
        r={R}
        fill="none"
        stroke={over ? colors.over : acc}
        strokeWidth={11}
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - pct)}
        transform="rotate(-90 60 60)"
      />
      <SvgText
        x={60}
        y={55}
        textAnchor="middle"
        fill={colors.text}
        fontFamily={font.dB}
        fontSize={27}
      >
        {over ? "+" + (cur - tgt) : left}
      </SvgText>
      <SvgText
        x={60}
        y={74}
        textAnchor="middle"
        fill={colors.muted}
        fontFamily={font.b}
        fontSize={10.5}
      >
        {over ? "OVER" : "KCAL LEFT"}
      </SvgText>
    </Svg>
  );
}

export function Spark({ vals, color }: { vals: number[]; color: string }) {
  const w = 58, h = 26, pad = 3;
  if (vals.length < 2) return null; // need at least two points to draw a line
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
  const pts = vals.map((v, i) => [
    pad + (i * (w - 2 * pad)) / (vals.length - 1),
    h - pad - ((v - mn) / rng) * (h - 2 * pad),
  ]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={2.6} fill={color} />
    </Svg>
  );
}

export function NetChart({ data, acc }: { data: { net: number }[]; acc: string }) {
  const w = 300, h = 130, n = data.length, gap = 4;
  const bw = (w - (n - 1) * gap) / n;
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.net)), 200);
  const zero = h / 2;
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <Line x1={0} y1={zero} x2={w} y2={zero} stroke={colors.grid} strokeWidth={1} strokeDasharray="3 3" />
      {data.map((d, i) => {
        const bh = Math.max((Math.abs(d.net) / maxAbs) * (h / 2 - 8), 2);
        const x = i * (bw + gap);
        const y = d.net <= 0 ? zero : zero - bh;
        const col = d.net <= 0 ? acc : colors.over;
        return <Rect key={i} x={x} y={y} width={bw} height={bh} rx={Math.min(bw / 2, 4)} fill={col} opacity={0.92} />;
      })}
    </Svg>
  );
}

/**
 * Generic dated line chart for a body-measurement time series.
 * Handles 1 point (single dot) and N points; draws first/last date labels and a
 * dashed goal line when `goal` is provided.
 */
export function MetricChart({
  series,
  acc,
  unit,
  goal,
}: {
  series: { date: string; value: number }[];
  acc: string;
  unit?: string;
  goal?: number;
}) {
  const w = 320, h = 160, padX = 16, padTop = 16, padBot = 30;
  const n = series.length;
  if (n === 0) return null;
  const vals = series.map((s) => s.value);
  const all = goal != null ? [...vals, goal] : vals;
  const rawMn = Math.min(...all), rawMx = Math.max(...all);
  const spread = rawMx - rawMn || Math.max(1, rawMx * 0.08);
  const lo = rawMn - spread * 0.18, hi = rawMx + spread * 0.18;
  const rng = hi - lo || 1;
  const X = (i: number) => (n === 1 ? w / 2 : padX + (i * (w - 2 * padX)) / (n - 1));
  const Y = (v: number) => (h - padBot) - ((v - lo) / rng) * ((h - padBot) - padTop);
  const pts = series.map((s, i) => [X(i), Y(s.value)] as const);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `${line} L ${pts[n - 1][0].toFixed(1)} ${h - padBot} L ${pts[0][0].toFixed(1)} ${h - padBot} Z`;
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-").map(Number);
    return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d}`;
  };
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <LinearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={acc} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={acc} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {goal != null && (
        <>
          <Line x1={padX} y1={Y(goal)} x2={w - padX} y2={Y(goal)} stroke={colors.muted} strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
          <SvgText x={w - padX} y={Y(goal) - 4} textAnchor="end" fill={colors.muted} fontFamily={font.b} fontSize={9}>
            {`goal ${goal}${unit || ""}`}
          </SvgText>
        </>
      )}
      {n > 1 && <Path d={area} fill="url(#mg)" />}
      {n > 1 && <Path d={line} fill="none" stroke={acc} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <Circle key={i} cx={p[0]} cy={p[1]} r={3} fill={colors.bg} stroke={acc} strokeWidth={2} />
      ))}
      <SvgText x={padX} y={h - 8} textAnchor="start" fill={colors.dim} fontFamily={font.b} fontSize={9.5}>
        {fmt(series[0].date)}
      </SvgText>
      {n > 1 && (
        <SvgText x={w - padX} y={h - 8} textAnchor="end" fill={colors.dim} fontFamily={font.b} fontSize={9.5}>
          {fmt(series[n - 1].date)}
        </SvgText>
      )}
    </Svg>
  );
}

