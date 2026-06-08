import { addDays, toLocalDateKey } from "./dates";
import type { BodyRecord, LogEntry, MacroTotals } from "./types";

export const streakFromDates = (loggedDates: string[], today = toLocalDateKey()) => {
  const dates = new Set(loggedDates);
  let cursor = today;
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
};

export const weightProgress = (startKg: number, currentKg: number, desiredKg: number) => {
  const span = desiredKg - startKg;
  if (span === 0) return 1;
  return Math.max(0, Math.min(1, (currentKg - startKg) / span));
};

export const summarizeLog = (entries: LogEntry[]): MacroTotals =>
  entries.reduce(
    (sum, entry) => ({
      kcal: sum.kcal + entry.kcal,
      protein_g: sum.protein_g + entry.protein_g,
      fat_g: sum.fat_g + entry.fat_g,
      carbs_g: sum.carbs_g + entry.carbs_g
    }),
    { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  );

export const latestWeight = (records: BodyRecord[], fallback = 80) => {
  const record = [...records].reverse().find((item) => item.weight_kg !== null);
  return record?.weight_kg ?? fallback;
};

export const projectTargetDate = (
  currentKg: number,
  desiredKg: number,
  averageDailyDeficitKcal: number,
  today = new Date()
) => {
  if (Math.abs(averageDailyDeficitKcal) < 100 || currentKg === desiredKg) return null;
  const kgToLose = currentKg - desiredKg;
  const days = Math.round((kgToLose * 7700) / averageDailyDeficitKcal);
  if (days <= 0 || days > 730) return null;
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date;
};
