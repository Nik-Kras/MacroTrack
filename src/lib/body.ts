import { fmtKey } from "@/lib/nutrition";
import type { Measurement, MetricKey } from "@/types";

export const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "waist", label: "Waist", unit: "cm" },
  { key: "bicep", label: "Bicep", unit: "cm" },
  { key: "chest", label: "Chest", unit: "cm" },
  { key: "leg", label: "Leg", unit: "cm" },
];

export const metricMeta = (key: MetricKey) => METRICS.find((m) => m.key === key)!;

/** All measurements for one metric, oldest → newest (stable for same-day entries). */
export function metricSeries(measurements: Measurement[], metric: MetricKey): Measurement[] {
  return measurements
    .filter((m) => m.metric === metric)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** The most recent measurement for a metric, or undefined if none logged yet. */
export function latestMetric(
  measurements: Measurement[],
  metric: MetricKey,
): Measurement | undefined {
  const s = metricSeries(measurements, metric);
  return s[s.length - 1];
}

/** Change from the first to the latest measurement (0 if fewer than two points). */
export function metricDelta(measurements: Measurement[], metric: MetricKey): number {
  const s = metricSeries(measurements, metric);
  if (s.length < 2) return 0;
  return +(s[s.length - 1].value - s[0].value).toFixed(1);
}

/**
 * A sensible starting value for the +/- stepper when logging a metric: the last
 * logged value if any, else the profile weight (for weight) or a typical default.
 */
export function defaultMetricValue(
  measurements: Measurement[],
  metric: MetricKey,
  profile: { weight: number },
): number {
  const last = latestMetric(measurements, metric);
  if (last) return last.value;
  if (metric === "weight") return profile.weight;
  const fallback: Record<Exclude<MetricKey, "weight">, number> = {
    waist: 80,
    bicep: 35,
    chest: 100,
    leg: 55,
  };
  return fallback[metric as Exclude<MetricKey, "weight">];
}

export function todayISO(): string {
  return fmtKey(new Date());
}

/** "2026-06-21" → "Jun 21". */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] || "";
  return `${mon} ${d}`;
}
