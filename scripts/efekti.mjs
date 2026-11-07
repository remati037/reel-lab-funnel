// Sekcija "Svi efekti" na landingu, iz docs/efekti-za-sajt.json u reel-lab repou.
// Kopira klipove (bez zvuka) i postere u public/assets/efekti-svi/, pa u index.html upiše kartice
// između <!-- efekti:start --> i <!-- efekti:end --> i broj efekata u svaki [data-fx-count].
// Pokreni kad stigne nova verzija plugina: npm run efekti (pa npm run standalone)
//   REEL_LAB=/putanja/do/reel-lab npm run efekti   ako repo nije na podrazumevanom mestu
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REEL_LAB = process.env.REEL_LAB || join(homedir(), "Vladsdigital/Ai Profit Lab/reel-lab");
const PICKER = join(REEL_LAB, "ai-video-editor/skills/ai-video-editor/picker");
const data = JSON.parse(readFileSync(join(REEL_LAB, "docs/efekti-za-sajt.json"), "utf8"));
const out = fileURLToPath(new URL("../public/assets/efekti-svi/", import.meta.url));
mkdirSync(out, { recursive: true });

const fresh = (src, dst) => existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ULOGE = { "Udica": "udica", "Objašnjenje": "objasnjenje", "Dokaz": "dokaz", "Poziv na akciju": "poziv" };

const cards = data.efekti.map((e) => {
  const uloga = ULOGE[e.uloga];
  if (!uloga) throw new Error(`Nepoznata uloga "${e.uloga}" za ${e.key}`);
  const video = join(PICKER, e.preview), poster = join(PICKER, e.poster);
  const v = join(out, `${e.key}.mp4`), p = join(out, `${e.key}.jpg`);
  // Na sajtu se pušta bez zvuka, pa audio trag samo usporava učitavanje
  if (!fresh(video, v)) execFileSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-an", "-c:v", "copy", "-movflags", "+faststart", v]);
  if (!fresh(poster, p)) copyFileSync(poster, p);
  return `        <li class="fx-card" data-uloga="${uloga}"${e.novo ? " data-novo" : ""}>
          <div class="media"><img src="assets/efekti-svi/${e.key}.jpg" alt="" loading="lazy" decoding="async"><video data-src="assets/efekti-svi/${e.key}.mp4" muted loop playsinline preload="none"></video>${e.novo ? '<span class="fx-new mono">Novo</span>' : ""}</div>
          <h4>${esc(e.naziv)}</h4>
          <p>${esc(e.opis)}</p>
        </li>`;
});

const indexUrl = new URL("../public/index.html", import.meta.url);
let html = readFileSync(indexUrl, "utf8");
const start = "<!-- efekti:start -->", end = "<!-- efekti:end -->";
const a = html.indexOf(start), b = html.indexOf(end);
if (a < 0 || b < a) throw new Error("U index.html nema oznaka efekti:start / efekti:end");
html = html.slice(0, a + start.length) + "\n" + cards.join("\n") + "\n        " + html.slice(b);
html = html.replace(/(<[^>]*data-fx-count[^>]*>)\d+(<)/g, `$1${data.ukupno}$2`);
html = html.replace(/(<[^>]*data-fx-new[^>]*>)\d+(<)/g, `$1${data.novo_u_1_2_0}$2`);
html = html.replace(/(<meta name="description" content="[^"]*?)\d+ efekata/, `$1${data.ukupno} efekata`);
writeFileSync(indexUrl, html);

if (cards.length !== data.ukupno) console.warn(`Pažnja: JSON kaže ${data.ukupno}, a efekata ima ${cards.length}`);
console.log(`${cards.length} efekata (${data.efekti.filter((e) => e.novo).length} novih) upisano u index.html, fajlovi u public/assets/efekti-svi/`);
