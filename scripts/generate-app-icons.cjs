// Run with: node scripts/generate-app-icons.cjs
// Requires sharp in your tooling environment, or SHARP_MODULE_PATH pointing to it.
/* global __dirname */
const { Buffer } = require("node:buffer");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require(process.env.SHARP_MODULE_PATH || "sharp");

const images = path.join(__dirname, "../src/assets/images");
const website = path.join(__dirname, "../docs/assets/branding");

async function main() {
  const svg = await fs.readFile(path.join(images, "icon.svg"), "utf8");
  const foreground = svg.replace(/\s*<rect\b[^>]*\/>/, "");
  await fs.mkdir(website, { recursive: true });

  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .removeAlpha()
    .png()
    .toFile(path.join(images, "icon.png"));
  await sharp(Buffer.from(svg))
    .resize(64, 64)
    .removeAlpha()
    .png()
    .toFile(path.join(images, "favicon.png"));
  await sharp(Buffer.from(foreground))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(images, "splash-icon.png"));

  // The artwork occupies 86% of the source width. Scaling the canvas to 70%
  // keeps it inside Android's central 66/108 adaptive-icon safe circle.
  await sharp(Buffer.from(foreground))
    .resize(716, 716)
    .extend({
      top: 154,
      bottom: 154,
      left: 154,
      right: 154,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(images, "adaptive-icon.png"));

  const alpha = await sharp(path.join(images, "adaptive-icon.png"))
    .extractChannel("alpha")
    .toBuffer();
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: "#ffffff" },
  })
    .joinChannel(alpha)
    .png()
    .toFile(path.join(images, "monochrome-icon.png"));

  await fs.writeFile(path.join(website, "why-not-atom.svg"), svg);
  await fs.copyFile(
    path.join(images, "favicon.png"),
    path.join(website, "favicon.png"),
  );
  await sharp(Buffer.from(svg))
    .resize(180, 180)
    .removeAlpha()
    .png()
    .toFile(path.join(website, "apple-touch-icon.png"));

  console.log(
    "Generated launcher, monochrome, splash, favicon and website assets from icon.svg",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
