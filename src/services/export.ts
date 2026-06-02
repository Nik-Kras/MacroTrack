import { LogEntry, MacroTotals } from '../types';
import { addMacros, formatMacro } from '../lib/math';

export function exportDayText(day: string, entries: LogEntry[]) {
  const totals = addMacros(entries);
  const lines = [`MacroTrack ${day}`, ''];
  for (const entry of entries) {
    const amount = entry.source_type === 'FOOD' ? `${entry.grams} g` : `${entry.servings_used} serving`;
    lines.push(
      `${entry.name} (${amount}) - ${formatMacro(entry.kcal)} kcal, ${formatMacro(entry.protein_g)}P ${formatMacro(entry.carbs_g)}C ${formatMacro(entry.fat_g)}F`
    );
  }
  lines.push('');
  lines.push(totalLine(totals));
  return lines.join('\n');
}

export function exportDayCsv(day: string, entries: LogEntry[]) {
  const rows = ['date,name,amount,kcal,protein_g,carbs_g,fat_g'];
  for (const entry of entries) {
    const amount = entry.source_type === 'FOOD' ? `${entry.grams} g` : `${entry.servings_used} serving`;
    rows.push(
      [
        day,
        csv(entry.name),
        csv(amount),
        formatMacro(entry.kcal),
        formatMacro(entry.protein_g),
        formatMacro(entry.carbs_g),
        formatMacro(entry.fat_g)
      ].join(',')
    );
  }
  return rows.join('\n');
}

export function exportSummaryCsv(rows: (MacroTotals & { log_date: string })[]) {
  return ['date,kcal,protein_g,carbs_g,fat_g']
    .concat(rows.map((row) => [row.log_date, formatMacro(row.kcal), formatMacro(row.protein_g), formatMacro(row.carbs_g), formatMacro(row.fat_g)].join(',')))
    .join('\n');
}

function csv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function totalLine(total: MacroTotals) {
  return `Totals - ${formatMacro(total.kcal)} kcal, ${formatMacro(total.protein_g)}P ${formatMacro(total.carbs_g)}C ${formatMacro(total.fat_g)}F`;
}
