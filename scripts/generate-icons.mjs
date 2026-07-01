import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(__dirname, "icon-source.svg"), "utf-8");

const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const roundedBg = `<rect x="0" y="0" width="512" height="512" rx="96" ry="96" fill="#0B0A08" />`;
const fullBleedBg = `<rect x="0" y="0" width="512" height="512" fill="#0B0A08" />`;

function withBackground(bgMarkup) {
  return source.replace(
    /<rect id="bg"[^/]*\/>/,
    bgMarkup,
  );
}

const anySvg = withBackground(roundedBg);
const maskableSvg = withBackground(fullBleedBg);

const targets = [
  { name: "icon-192.png", svg: anySvg, size: 192 },
  { name: "icon-512.png", svg: anySvg, size: 512 },
  { name: "apple-touch-icon.png", svg: anySvg, size: 180 },
  { name: "icon-maskable-192.png", svg: maskableSvg, size: 192 },
  { name: "icon-maskable-512.png", svg: maskableSvg, size: 512 },
];

for (const t of targets) {
  await sharp(Buffer.from(t.svg))
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(outDir, t.name));
  console.log("Generated", t.name);
}
