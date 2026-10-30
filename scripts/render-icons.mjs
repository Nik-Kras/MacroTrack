// Draws the app icon — a strawberry on a kitchen scale, peering nervously at the macro
// readout (in the spirit of RHP's worried tomato) — and writes assets/icon.png,
// adaptive-icon.png (foreground only, inside Android's mask-safe zone) and splash-icon.png.
// Usage: pnpm icons   (needs Playwright's Chromium; RHP has it)
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("@playwright/test"));
} catch {
  ({ chromium } = require(process.env.HOME + "/Repos/RHP/node_modules/@playwright/test"));
}

/** Background of the icon and of the adaptive icon's back layer (app.json). */
const BG = "#39E08A";

const INK = "#2A2118";
const face = (cx, cy, s = 1, ink = INK) => `
<g transform="translate(${cx} ${cy}) scale(${s})">
  <path d="M-114 -62 Q-80 -84 -42 -70" fill="none" stroke="${ink}" stroke-width="14" stroke-linecap="round"/>
  <path d="M42 -70 Q80 -84 114 -62" fill="none" stroke="${ink}" stroke-width="14" stroke-linecap="round"/>
  <ellipse cx="-66" cy="0" rx="50" ry="56" fill="#FFFFFF" stroke="rgba(0,0,0,.12)" stroke-width="4"/>
  <ellipse cx="66" cy="0" rx="50" ry="56" fill="#FFFFFF" stroke="rgba(0,0,0,.12)" stroke-width="4"/>
  <circle cx="-60" cy="26" r="25" fill="#1E1A16"/><circle cx="60" cy="26" r="25" fill="#1E1A16"/>
  <circle cx="-52" cy="18" r="8" fill="#FFFFFF"/><circle cx="68" cy="18" r="8" fill="#FFFFFF"/>
  <circle cx="-116" cy="80" r="24" fill="#F2698F" opacity=".38"/><circle cx="116" cy="80" r="24" fill="#F2698F" opacity=".38"/>
  <path d="M-36 108 q12 -12 24 0 t24 0 t24 0" fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;
const drop = (x, y) => `
<path d="M${x} ${y} C${x} ${y} ${x - 26} ${y + 36} ${x - 26} ${y + 54} A26 26 0 0 0 ${x + 26} ${y + 54} C${x + 26} ${y + 36} ${x} ${y} ${x} ${y} Z" fill="#9FD3F5"/>
<path d="M${x - 10} ${y + 46} a10 10 0 0 0 8 14" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".8"/>`;
const scaleBack = `
  <ellipse cx="512" cy="872" rx="300" ry="30" fill="#000" opacity=".22"/>
  <rect x="212" y="716" width="600" height="148" rx="54" fill="#E4E9EF"/>
  <rect x="212" y="790" width="600" height="74" rx="37" fill="#C9D1DA"/>
  <rect x="212" y="790" width="600" height="20" fill="#C9D1DA"/>
  <rect x="386" y="744" width="252" height="92" rx="20" fill="#0E1116"/>
  <rect x="414" y="790" width="48" height="26" rx="7" fill="#5B8DEF"/>
  <rect x="488" y="770" width="48" height="46" rx="7" fill="#F5B544"/>
  <rect x="562" y="782" width="48" height="34" rx="7" fill="#F2698F"/>
  <circle cx="752" cy="790" r="16" fill="#39E08A"/>
  <rect x="252" y="684" width="520" height="40" rx="20" fill="#AEB8C4"/>`;

const strawberry = `
    <path d="M512 704 C426 694 326 566 326 446 C326 336 418 296 512 306 C606 296 698 336 698 446 C698 566 598 694 512 704 Z" fill="#E8434E"/>
    <path d="M512 704 C580 690 676 590 690 470 C696 420 680 380 652 360 C690 470 640 620 512 704 Z" fill="#C93441"/>
    <g fill="#F7D774">${[[390, 470], [440, 610], [600, 610], [640, 470], [512, 660], [380, 560], [648, 560]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="12"/>`).join("")}</g>
    <path d="M512 330 L456 268 L520 296 L560 250 L566 306 L628 292 L576 336 Z" fill="#3E9B4F"/>
    <path d="M512 306 L500 236" stroke="#2E7D3E" stroke-width="14" stroke-linecap="round"/>
    ${face(512, 470, 0.84, "#3A1418")}${drop(690, 360)}`;

const svg = (bg, scale = 1) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">` +
  (bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : "") +
  `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${scaleBack}${strawberry}</g></svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
async function render(markup, file, transparent) {
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  await writeFile(file, await page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: 1024, height: 1024 } }));
}
await render(svg(BG), "assets/icon.png", false);
// Launchers show the middle two-thirds of an adaptive icon: draw it smaller.
await render(svg(null, 0.8), "assets/adaptive-icon.png", true);
await render(svg(null, 0.8), "assets/splash-icon.png", true);
await browser.close();
console.log("icons written");
