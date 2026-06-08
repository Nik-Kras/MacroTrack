import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const source = path.join("data", "samples", "Macros App - Product Nutrition Database.xlsx");
const outDir = path.join("src", "data");
const outFile = path.join(outDir, "foods.seed.json");

const workbook = XLSX.readFile(source);
const sheetName = workbook.SheetNames[0];
if (!sheetName) {
  throw new Error("Food workbook has no sheets");
}

const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
  header: 1,
  blankrows: false,
  defval: ""
});

const headerIndex = rows.findIndex((row) => row.includes("category") && row.includes("product_name"));
if (headerIndex === -1) {
  throw new Error("Unable to locate Product Database header row");
}

const headers = rows[headerIndex].map((value) => String(value).trim());
const start = headerIndex + 1;

const get = (row, name) => row[headers.indexOf(name)];
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const flag = (value) => (number(value) > 0 ? 1 : 0);

const foods = rows
  .slice(start)
  .filter((row) => get(row, "category") && get(row, "product_name"))
  .map((row, index) => ({
    id: index + 1,
    kind: String(get(row, "category")).toUpperCase() === "DISH" ? "DISH" : "PRODUCT",
    is_seed: 1,
    category: String(get(row, "category")),
    name: String(get(row, "product_name")).trim(),
    name_ua: String(get(row, "product_name_ua")).trim(),
    aliases: String(get(row, "aliases")).trim(),
    aliases_ua: String(get(row, "aliases_ua")).trim(),
    barcode: String(get(row, "barcode") || "").trim(),
    kcal: number(get(row, "kcal")),
    protein_g: number(get(row, "protein_g")),
    fat_g: number(get(row, "fat_g")),
    carbs_g: number(get(row, "carbs_g")),
    low_kcal: flag(get(row, "low_kcal")),
    high_kcal: flag(get(row, "high_kcal")),
    low_fat: flag(get(row, "low_fat")),
    high_fat: flag(get(row, "high_fat")),
    low_protein: flag(get(row, "low_protein")),
    high_protein: flag(get(row, "high_protein")),
    low_carbs: flag(get(row, "low_carbs")),
    high_carbs: flag(get(row, "high_carbs")),
    servings: []
  }));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(foods, null, 2)}\n`);
console.log(`Wrote ${foods.length} seed foods to ${outFile}`);
