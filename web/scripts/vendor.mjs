// Kopieert Leaflet en de fonts uit node_modules naar static/vendor (lokaal gebundeld, geen CDN).
import { cpSync, mkdirSync, rmSync } from "node:fs";

const out = "static/vendor";
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/fonts`, { recursive: true });

cpSync("node_modules/leaflet/dist/leaflet.js", `${out}/leaflet/leaflet.js`);
cpSync("node_modules/leaflet/dist/leaflet.css", `${out}/leaflet/leaflet.css`);
cpSync("node_modules/leaflet/dist/images", `${out}/leaflet/images`, { recursive: true });

const fonts = {
  "inter-latin-wght-normal.woff2": "@fontsource-variable/inter",
  "jetbrains-mono-latin-wght-normal.woff2": "@fontsource-variable/jetbrains-mono",
};
for (const [file, pkg] of Object.entries(fonts)) {
  cpSync(`node_modules/${pkg}/files/${file}`, `${out}/fonts/${file}`);
}
console.log("vendor-bestanden gekopieerd naar", out);
