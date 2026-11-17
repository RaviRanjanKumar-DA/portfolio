// Copies only public files into dist/ for Cloudflare Pages (keeps .dev.vars, migrations, docs etc. out of the deploy)
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
const out = "dist";
const files = ["index.html", "style.css", "script.js", "hero3d.js", "thanks.html", "profile.jpg", "favicon.svg", "og-image.png", "robots.txt", "_headers"];
const dirs = ["icons", "admin"];
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of files) if (existsSync(f)) cpSync(f, `${out}/${f}`);
for (const d of dirs) if (existsSync(d)) cpSync(d, `${out}/${d}`, { recursive: true });
console.log("built dist/");
