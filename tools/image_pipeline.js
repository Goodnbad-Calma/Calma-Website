#!/usr/bin/env node
/**
 * Image Optimization & Organization Pipeline
 * - Compress images while maintaining acceptable quality
 * - Convert photos → JPEG, graphics → PNG (heuristic)
 * - Standardize dimensions (resize to max bounds while preserving aspect ratio)
 * - Detect and flag potential duplicates (no deletion)
 * - Produce `data_dump/` with mirrored structure, manifest, checksums, and version history
 * - Preserve all originals untouched
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const CONFIG = {
  // Source directories to process (relative to project root)
  sources: ['images'],
  // Output root folder
  outRoot: 'data_dump',
  processedDir: 'processed',
  duplicatesDir: 'duplicates',
  manifestFile: 'manifest.json',
  historyFile: 'history.json',
  // Standardization limits
  maxWidth: 2048,
  maxHeight: 2048,
  // Compression settings
  jpegQuality: 80, // acceptable visual quality for photos
  pngCompressionLevel: 9, // max compression
  // Duplicate detection settings
  hashSize: 8, // 8x8 aHash
  duplicateHammingThreshold: 5, // <=5 bits difference → likely duplicate
  // File types to process
  includeExt: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
};

function nowTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function isImageExt(file) {
  const ext = path.extname(file).toLowerCase();
  return CONFIG.includeExt.includes(ext);
}

async function* walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

// Average Hash (aHash) using sharp
async function aHash(file) {
  try {
    const img = sharp(file).grayscale().resize(CONFIG.hashSize, CONFIG.hashSize, { fit: 'fill' });
    const { data } = await img.raw().toBuffer({ resolveWithObject: true });
    const avg = data.reduce((acc, v) => acc + v, 0) / data.length;
    const bits = Array.from(data).map(v => (v >= avg ? 1 : 0));
    // pack bits to hex string
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      const nibble = (bits[i] << 3) | (bits[i+1] << 2) | (bits[i+2] << 1) | (bits[i+3] << 0);
      hex += nibble.toString(16);
    }
    return hex; // length = (hashSize*hashSize)/4
  } catch (e) {
    return null; // unsupported image
  }
}

function hammingDistanceHex(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    // count bits in x (0-15)
    dist += [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4][x];
  }
  return dist;
}

// Heuristic to decide target format: photo → JPEG, graphics → PNG
async function decideFormat(inputPath, meta) {
  const ext = path.extname(inputPath).toLowerCase();
  const hasAlpha = Boolean(meta.hasAlpha);
  const isPng = ext === '.png';
  const isGif = ext === '.gif';
  const isWebp = ext === '.webp';
  const isJpeg = ext === '.jpg' || ext === '.jpeg';

  // If GIF (animated or not), keep PNG/JPEG conversion OFF; copy as-is
  if (isGif) return 'gif';
  // If has alpha, prefer PNG
  if (hasAlpha) return 'png';
  // If original is small PNG, likely graphic → keep PNG
  try {
    const stat = await fsp.stat(inputPath);
    if (isPng && stat.size < 256 * 1024) return 'png';
  } catch (_) {}
  // Otherwise, default to JPEG for photos
  if (isJpeg || !isPng || isWebp) return 'jpeg';
  // Fallback
  return isPng ? 'png' : 'jpeg';
}

async function processImage(srcFile, destFile, manifest, duplicatesIndex) {
  const rel = path.relative(process.cwd(), srcFile).replace(/\\/g, '/');
  const outRel = path.relative(process.cwd(), destFile).replace(/\\/g, '/');
  const version = nowTimestamp();

  const originalBuf = await fsp.readFile(srcFile);
  const originalChecksum = sha256(originalBuf);

  const instance = sharp(originalBuf);
  const meta = await instance.metadata();
  const targetFormat = await decideFormat(srcFile, meta);

  // Resize if larger than max bounds
  let width = meta.width || null;
  let height = meta.height || null;
  const needResize = width && height && (width > CONFIG.maxWidth || height > CONFIG.maxHeight);
  const resizeOptions = needResize ? { width: Math.min(width, CONFIG.maxWidth), height: Math.min(height, CONFIG.maxHeight), fit: 'inside', withoutEnlargement: true } : {};

  let pipeline = instance.clone().resize(resizeOptions);
  let outExt = path.extname(destFile);
  let outPath = destFile;
  // Configure output by target format
  if (targetFormat === 'jpeg') {
    pipeline = pipeline.jpeg({ quality: CONFIG.jpegQuality, mozjpeg: true });
    outExt = '.jpg';
  } else if (targetFormat === 'png') {
    pipeline = pipeline.png({ compressionLevel: CONFIG.pngCompressionLevel, adaptiveFiltering: true });
    outExt = '.png';
  } else if (targetFormat === 'gif') {
    // Sharp cannot encode GIF; copy through without transformation
    await fsp.copyFile(srcFile, destFile);
    const processedBuf = await fsp.readFile(destFile);
    const processedChecksum = sha256(processedBuf);
    const hash = await aHash(destFile);
    const duplicateGroup = registerDuplicate(hash, rel, duplicatesIndex);
    const record = {
      original: rel,
      processed: outRel,
      operations: ['copy'],
      format: 'gif',
      resized: false,
      originalSize: originalBuf.length,
      processedSize: processedBuf.length,
      originalChecksum,
      processedChecksum,
      duplicateGroup,
      version,
    };
    manifest.items.push(record);
    return record;
  }

  // Ensure destination path extension matches target
  if (path.extname(destFile).toLowerCase() !== outExt) {
    outPath = destFile.replace(new RegExp(`${path.extname(destFile)}$`, 'i'), outExt);
  }

  ensureDirSync(path.dirname(outPath));
  const processedBuf = await pipeline.toBuffer();
  await fsp.writeFile(outPath, processedBuf);

  const processedChecksum = sha256(processedBuf);
  const hash = await aHash(outPath);
  const duplicateGroup = registerDuplicate(hash, rel, duplicatesIndex);

  const record = {
    original: rel,
    processed: path.relative(process.cwd(), outPath).replace(/\\/g, '/'),
    operations: [needResize ? 'resize' : 'none', `convert:${targetFormat}`, 'compress'],
    format: targetFormat,
    resized: Boolean(needResize),
    originalSize: originalBuf.length,
    processedSize: processedBuf.length,
    originalChecksum,
    processedChecksum,
    duplicateGroup,
    version,
  };
  manifest.items.push(record);
  return record;
}

function registerDuplicate(hash, relPath, index) {
  if (!hash) return null;
  // Compare against existing groups
  for (const group of index.groups) {
    const dist = hammingDistanceHex(hash, group.hash);
    if (dist <= CONFIG.duplicateHammingThreshold) {
      group.files.push(relPath);
      return group.id;
    }
  }
  // Create a new group
  const id = `dup-${index.groups.length + 1}`;
  index.groups.push({ id, hash, files: [relPath] });
  return id;
}

async function main() {
  const projectRoot = process.cwd();
  const outRoot = path.join(projectRoot, CONFIG.outRoot);
  const processedRoot = path.join(outRoot, CONFIG.processedDir);
  const duplicatesRoot = path.join(outRoot, CONFIG.duplicatesDir);
  ensureDirSync(outRoot);
  ensureDirSync(processedRoot);
  ensureDirSync(duplicatesRoot);

  const manifest = {
    version: nowTimestamp(),
    config: {
      maxWidth: CONFIG.maxWidth,
      maxHeight: CONFIG.maxHeight,
      jpegQuality: CONFIG.jpegQuality,
      pngCompressionLevel: CONFIG.pngCompressionLevel,
      duplicateHammingThreshold: CONFIG.duplicateHammingThreshold,
    },
    items: [],
    duplicates: [],
  };
  const duplicatesIndex = { groups: [] };

  for (const src of CONFIG.sources) {
    const abs = path.join(projectRoot, src);
    if (!fs.existsSync(abs)) continue;
    for await (const file of walk(abs)) {
      if (!isImageExt(file)) continue;
      const rel = path.relative(abs, file);
      const outFile = path.join(processedRoot, src, rel);
      ensureDirSync(path.dirname(outFile));
      try {
        await processImage(file, outFile, manifest, duplicatesIndex);
      } catch (err) {
        manifest.items.push({
          original: path.relative(projectRoot, file),
          error: String(err && err.message ? err.message : err),
        });
      }
    }
  }

  // Finalize duplicate groups: copy files to duplicates folder for manual review
  for (const group of duplicatesIndex.groups) {
    if (group.files.length <= 1) continue; // singletons are not duplicates
    const groupDir = path.join(duplicatesRoot, group.id);
    ensureDirSync(groupDir);
    for (const rel of group.files) {
      const abs = path.join(projectRoot, rel);
      const base = path.basename(rel);
      const target = path.join(groupDir, base);
      try {
        await fsp.copyFile(abs, target);
      } catch (_) {}
    }
    manifest.duplicates.push({ id: group.id, files: group.files });
  }

  // Write manifest and history snapshot
  const manifestPath = path.join(outRoot, CONFIG.manifestFile);
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  const historyPath = path.join(outRoot, CONFIG.historyFile);
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(await fsp.readFile(historyPath, 'utf-8'));
    } catch (_) {}
  }
  history.push({ version: manifest.version, manifest: CONFIG.manifestFile, items: manifest.items.length, duplicates: manifest.duplicates.length });
  await fsp.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');

  // Also store a versioned snapshot of the manifest
  const versionsDir = path.join(outRoot, 'versions', manifest.version);
  ensureDirSync(versionsDir);
  await fsp.writeFile(path.join(versionsDir, CONFIG.manifestFile), JSON.stringify(manifest, null, 2), 'utf-8');

  // Create readme
  const readme = `Calma Image Optimization Data Dump\n\n` +
    `What this contains:\n` +
    `- processed/: optimized images with mirrored directory structure (originals are untouched)\n` +
    `- duplicates/: groups of suspected duplicates for manual review (no deletions)\n` +
    `- manifest.json: detailed per-file operations, checksums, and duplicate group IDs\n` +
    `- history.json: version history records for each optimization run\n` +
    `- versions/<timestamp>/manifest.json: snapshot of the manifest for this run\n\n` +
    `Verification steps:\n` +
    `- Use checksums (SHA-256 in manifest.json) to verify integrity\n` +
    `- Review duplicates/ folders; keep or remove manually as needed\n` +
    `- Compare original vs processed sizes and formats to validate optimization\n\n` +
    `Configuration (in script):\n` +
    `- maxWidth=${CONFIG.maxWidth}, maxHeight=${CONFIG.maxHeight}\n` +
    `- jpegQuality=${CONFIG.jpegQuality}, pngCompressionLevel=${CONFIG.pngCompressionLevel}\n` +
    `- duplicateHammingThreshold=${CONFIG.duplicateHammingThreshold}\n\n` +
    `Reversibility:\n` +
    `- Originals are preserved. Processed images exist only in data_dump/processed.\n` +
    `- No automatic deletions are performed.\n`;
  await fsp.writeFile(path.join(outRoot, 'readme.txt'), readme, 'utf-8');

  console.log(`Image optimization complete.`);
  console.log(`Processed items: ${manifest.items.length}`);
  console.log(`Duplicate groups: ${manifest.duplicates.length}`);
  console.log(`Output written to: ${outRoot}`);
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});