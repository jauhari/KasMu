import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.resolve(__dirname, "../public/icon.svg");
const pngPath = path.resolve(__dirname, "../public/apple-touch-icon.png");

const svg = fs.readFileSync(svgPath);

sharp(svg)
  .resize(180, 180)
  .png()
  .toFile(pngPath)
  .then(() => console.log("Generated", pngPath))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
