#!/usr/bin/env node
// Generates neutral wireframe placeholder images (SVG) + metadata entries
// marked source: "placeholder". Safe to re-run (replaces previous placeholders).
// Remove them with: npm run remove-placeholders
import fs from "fs";
import path from "path";
import { readList, writeList, makeThumb, THUMBS_DIR } from "../lib/ingest.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const screensDir = path.join(root, "public", "screens");
fs.mkdirSync(screensDir, { recursive: true });

const W = 1440, H = 900;
const C = { bg: "#F7F7F8", panel: "#FFFFFF", line: "#E6E6EA", block: "#E9E9EE", dark: "#C9C9D2", text: "#D7D7DE" };

const r = (x, y, w, h, fill = C.block, rx = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const frame = (accent, inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C.bg}"/>
${inner}
<g transform="translate(${W - 300} ${H - 64})"><rect width="276" height="40" rx="20" fill="#FFFFFF" stroke="${C.line}"/>
<circle cx="22" cy="20" r="6" fill="${accent}"/>
<text x="38" y="25" font-family="Inter, Helvetica, Arial, sans-serif" font-size="14" fill="#8A8A96" letter-spacing=".4">PLACEHOLDER · ${label}</text></g>
</svg>`;

const shell = (accent, content) => `
${r(0, 0, 240, H, C.panel, 0)}<rect x="240" y="0" width="1" height="${H}" fill="${C.line}"/>
${r(24, 24, 28, 28, accent, 8)}${r(62, 32, 110, 12, C.dark)}
${[0,1,2,3,4,5,6].map(i => r(24, 96 + i * 40, i === 1 ? 192 : 150, 14, i === 1 ? C.dark : C.block)).join("")}
${r(241, 0, W - 241, 64, C.panel, 0)}<rect x="241" y="64" width="${W - 241}" height="1" fill="${C.line}"/>
${r(272, 22, 320, 20, C.bg, 10)}${r(W - 64, 18, 28, 28, C.dark, 14)}${r(W - 180, 20, 100, 24, accent, 8)}
${content}`;

const L = {
  dashboard: (a) => shell(a, `
    ${r(272, 96, 260, 18, C.dark)}
    ${[0,1,2,3].map(i => r(272 + i * 284, 136, 264, 110, C.panel, 12) + r(292 + i * 284, 158, 90, 10) + r(292 + i * 284, 184, 140, 26, C.dark)).join("")}
    ${r(272, 270, 700, 380, C.panel, 12)}
    <polyline fill="none" stroke="${a}" stroke-width="4" points="300,600 380,560 460,580 540,500 620,520 700,440 780,470 860,380 940,400"/>
    ${r(992, 270, 416, 380, C.panel, 12)}
    ${[0,1,2,3,4,5].map(i => r(1016, 300 + i * 54, 368, 36, C.bg, 8)).join("")}
    ${r(272, 674, 1136, 160, C.panel, 12)}`),
  "list/table": (a) => shell(a, `
    ${r(272, 96, 200, 20, C.dark)}
    ${[0,1,2,3].map(i => r(272 + i * 120, 136, 108, 30, C.panel, 15)).join("")}${r(W - 152, 136, 120, 30, a, 8)}
    ${r(272, 184, 1136, 650, C.panel, 12)}${r(272, 184, 1136, 44, "#F2F2F5", 12)}
    ${[0,1,2,3,4,5,6,7,8,9,10].map(i => `<rect x="272" y="${228 + i * 54}" width="1136" height="1" fill="${C.line}"/>` + r(296, 246 + i * 54, 16, 16, C.block, 4) + r(332, 246 + i * 54, 180, 14, C.dark) + r(560, 246 + i * 54, 140, 14) + r(760, 246 + i * 54, 90, 18, i % 3 ? C.block : a + "55", 9) + r(920, 246 + i * 54, 200, 14) + r(1200, 246 + i * 54, 120, 14)).join("")}`),
  "pipeline/kanban": (a) => shell(a, `
    ${r(272, 96, 220, 20, C.dark)}
    ${[0,1,2,3,4].map(c => r(272 + c * 230, 140, 214, 700, "#EFEFF3", 12) + r(288 + c * 230, 158, 110, 12, C.dark) +
      [0,1,2,3].slice(0, 4 - (c % 3)).map(k => r(284 + c * 230, 186 + k * 128, 190, 112, C.panel, 10) + r(300 + c * 230, 204 + k * 128, 130, 12, C.dark) + r(300 + c * 230, 228 + k * 128, 90, 10) + r(300 + c * 230, 262 + k * 128, 60, 18, a + "44", 9)).join("")).join("")}`),
  "detail/record": (a) => shell(a, `
    ${r(272, 96, 64, 64, a + "55", 32)}${r(352, 104, 260, 20, C.dark)}${r(352, 136, 180, 12)}
    ${r(W - 260, 104, 100, 32, C.panel, 8)}${r(W - 148, 104, 116, 32, a, 8)}
    ${[0,1,2,3].map(i => r(272 + i * 110, 188, 90, 14, i === 0 ? C.dark : C.block)).join("")}<rect x="272" y="214" width="1136" height="1" fill="${C.line}"/>
    ${r(272, 236, 340, 600, C.panel, 12)}${[0,1,2,3,4,5,6,7].map(i => r(296, 264 + i * 66, 90, 10) + r(296, 282 + i * 66, 200, 14, C.dark)).join("")}
    ${r(632, 236, 776, 600, C.panel, 12)}${[0,1,2,3,4].map(i => r(660, 268 + i * 108, 36, 36, C.block, 18) + r(712, 272 + i * 108, 300, 12, C.dark) + r(712, 294 + i * 108, 640, 10) + r(712, 312 + i * 108, 520, 10)).join("")}`),
  login: (a) => `
    ${r(0, 0, 720, H, a + "22", 0)}${r(80, 80, 40, 40, a, 10)}${r(80, 640, 420, 28, a + "55")}${r(80, 684, 320, 16, a + "33")}
    ${r(880, 220, 400, 460, C.panel, 16)}${r(920, 260, 180, 22, C.dark)}${r(920, 296, 260, 12)}
    ${r(920, 350, 320, 44, C.bg, 8)}${r(920, 410, 320, 44, C.bg, 8)}${r(920, 478, 320, 44, a, 8)}
    <rect x="920" y="552" width="320" height="1" fill="${C.line}"/>${r(920, 578, 320, 44, C.panel, 8)}<rect x="920.5" y="578.5" width="319" height="43" rx="8" fill="none" stroke="${C.line}"/>`,
  pricing: (a) => `
    ${r(0, 0, W, 64, C.panel, 0)}${r(40, 20, 28, 28, a, 8)}${r(W - 160, 18, 120, 30, a, 8)}
    ${r(520, 120, 400, 30, C.dark)}${r(580, 168, 280, 14)}${r(640, 210, 160, 32, C.panel, 16)}
    ${[0,1,2].map(i => r(250 + i * 330, 280, 300, 520, i === 1 ? C.panel : C.panel, 16) + (i === 1 ? `<rect x="${250.5 + i * 330}" y="280.5" width="299" height="519" rx="16" fill="none" stroke="${a}" stroke-width="2"/>` : "") + r(280 + i * 330, 316, 100, 14, C.dark) + r(280 + i * 330, 350, 140, 36, C.dark) + r(280 + i * 330, 410, 240, 44, i === 1 ? a : C.bg, 8) + [0,1,2,3,4,5].map(k => r(280 + i * 330, 490 + k * 40, 180 + (k % 2) * 40, 12)).join("")).join("")}`,
  settings: (a) => shell(a, `
    ${r(272, 96, 180, 20, C.dark)}
    ${r(272, 140, 220, 400, C.panel, 12)}${[0,1,2,3,4,5,6].map(i => r(288, 160 + i * 48, 180, 28, i === 2 ? a + "33" : C.panel, 6)).join("")}
    ${r(512, 140, 896, 700, C.panel, 12)}
    ${[0,1,2,3,4].map(i => r(544, 176 + i * 100, 160, 12, C.dark) + r(544, 198 + i * 100, 300, 10) + r(900, 184 + i * 100, 470, 40, C.bg, 8)).join("")}
    ${r(1260, 780, 120, 36, a, 8)}`),
  "empty state": (a) => shell(a, `
    ${r(272, 96, 200, 20, C.dark)}
    ${r(272, 140, 1136, 700, C.panel, 12)}
    <circle cx="840" cy="400" r="64" fill="${a}22"/>${r(808, 368, 64, 64, a + "66", 14)}
    ${r(700, 500, 280, 20, C.dark)}${r(660, 536, 360, 12)}${r(720, 560, 240, 12)}${r(770, 604, 140, 40, a, 8)}`),
  modal: (a) => L.dashboard(a) + `<rect width="${W}" height="${H}" fill="#0B0B12" opacity=".35"/>
    ${r(470, 190, 500, 520, C.panel, 16)}${r(502, 226, 220, 20, C.dark)}${r(502, 262, 340, 12)}
    ${r(502, 310, 436, 44, C.bg, 8)}${r(502, 374, 436, 44, C.bg, 8)}${r(502, 438, 436, 120, C.bg, 8)}
    <rect x="470" y="620" width="500" height="1" fill="${C.line}"/>${r(722, 640, 100, 40, C.bg, 8)}${r(834, 640, 104, 40, a, 8)}`,
  onboarding: (a) => `
    ${r(0, 0, W, 64, C.panel, 0)}${r(40, 20, 28, 28, a, 8)}
    ${[0,1,2,3].map(i => r(520 + i * 108, 120, 92, 6, i < 2 ? a : C.block, 3)).join("")}
    ${r(470, 170, 500, 28, C.dark)}${r(520, 216, 400, 14)}
    ${[0,1,2,3,4,5].map(i => r(400 + (i % 3) * 220, 280 + Math.floor(i / 3) * 190, 200, 170, C.panel, 14) + r(424 + (i % 3) * 220, 304 + Math.floor(i / 3) * 190, 40, 40, i === 1 ? a + "66" : C.block, 10) + r(424 + (i % 3) * 220, 364 + Math.floor(i / 3) * 190, 120, 12, C.dark) + r(424 + (i % 3) * 220, 386 + Math.floor(i / 3) * 190, 150, 10)).join("")}
    ${r(600, 700, 110, 44, C.panel, 8)}${r(730, 700, 110, 44, a, 8)}`,
};

const A = { indigo: "#6366F1", orange: "#F97316", emerald: "#10B981", sky: "#0EA5E9", rose: "#F43F5E", violet: "#8B5CF6" };

const seeds = [
  ["Example CRM A", "dashboard", A.indigo, ["charts", "kpi cards", "activity feed", "date range"], "Sales overview with KPI cards, revenue trend line and recent deals."],
  ["Example CRM A", "list/table", A.indigo, ["filters", "bulk actions", "saved views", "column sorting"], "Contacts table with filter chips, status pills and row selection."],
  ["Example CRM A", "pipeline/kanban", A.indigo, ["kanban", "drag and drop", "deal cards"], "Deal pipeline board with stage columns and compact deal cards."],
  ["Example CRM B", "detail/record", A.orange, ["activity timeline", "inline edit", "tabs", "properties panel"], "Company record: properties sidebar, tabs and activity timeline."],
  ["Example CRM B", "login", A.orange, ["SSO", "split layout"], "Split-screen sign-in with email/password and Google SSO."],
  ["Example CRM B", "pricing", A.orange, ["plan comparison", "billing toggle", "highlighted plan"], "Three-tier pricing with monthly/annual toggle and highlighted plan."],
  ["Example CRM C", "settings", A.emerald, ["side nav", "forms", "permissions"], "Workspace settings with secondary nav and labelled form rows."],
  ["Example CRM C", "empty state", A.emerald, ["empty state", "primary CTA", "illustration"], "Empty deals list with icon, explanation and a single primary CTA."],
  ["Example CRM C", "modal", A.emerald, ["create record", "forms", "overlay"], "Create-deal modal over the dashboard with grouped form fields."],
  ["Example Helpdesk", "onboarding", A.sky, ["stepper", "choice cards", "progress"], "Onboarding step: pick a use case from choice cards with a progress stepper."],
  ["Example Helpdesk", "list/table", A.sky, ["filters", "status pills", "assignee"], "Ticket queue table with status, priority and assignee columns."],
  ["Example Analytics", "dashboard", A.violet, ["charts", "widgets", "leaderboard"], "Team performance dashboard with chart widget and leaderboard list."],
];

const countArg = process.argv.indexOf("--count");
const COUNT = countArg > -1 ? Number(process.argv[countArg + 1]) : seeds.length;

let list = readList();
const placeholderFiles = new Set(list.filter((x) => x.source === "placeholder").flatMap((x) => [x.file && path.join(screensDir, x.file), x.thumb && path.join(THUMBS_DIR, x.thumb)]));
for (const f of placeholderFiles) { try { if (f) fs.unlinkSync(f); } catch {} }
list = list.filter((x) => x.source !== "placeholder");

// Oldest first so the app view shows each product's screens in this order.
const base = Date.now() - COUNT * 60_000;
for (let i = 0; i < COUNT; i++) {
  const k = i % seeds.length;
  const [app0, type, accent, tags, description] = seeds[k];
  const copy = Math.floor(i / seeds.length);
  const app = copy ? `${app0} ${copy + 1}` : app0; // stress mode: spread copies over more apps
  const n = String(k + 1).padStart(2, "0");
  const file = `placeholder-${n}.svg`;
  if (copy === 0) {
    const svg = frame(accent, L[type](accent), type.toUpperCase());
    fs.writeFileSync(path.join(screensDir, file), svg);
    await makeThumb(Buffer.from(svg), `placeholder-${n}`);
  }
  list.push({
    id: copy ? `placeholder-${n}-${copy + 1}` : `placeholder-${n}`,
    file, thumb: `placeholder-${n}.webp`, width: W, height: H,
    app, category: app.includes("Helpdesk") ? "Helpdesk" : app.includes("Analytics") ? "Analytics" : "CRM",
    screenType: type, tags, description: `[Placeholder] ${description}`, source: "placeholder",
    addedAt: new Date(base + i * 60_000).toISOString(),
  });
}

writeList(list);
console.log(`Seeded ${COUNT} placeholder screens. Total: ${list.length}`);
