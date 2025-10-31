#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const IMAGES = path.join(ROOT, 'images');
const MANIFEST = path.join(ROOT, 'gallery.json');

function ensureExiftool() {
    try { execSync('exiftool -ver', { stdio: 'ignore' }); }
    catch (e) { console.error('exiftool not found. Install with: brew install exiftool'); process.exit(1); }
}

function readExifJson() {
    const out = execSync(`exiftool -j -dateFormat "%Y-%m-%dT%H:%M:%S" -DateTimeOriginal -CreateDate -Make -Model -FNumber -ExposureTime -ISO ${JSON.stringify(IMAGES)}`, { encoding: 'utf8' });
    return JSON.parse(out);
}

function toIsoDate(rec) {
    const raw = rec.DateTimeOriginal || rec.CreateDate;
    if (!raw) return null;
    const norm = String(raw).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const d = new Date(norm);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

function hashKey(filePath) {
    // Use file path + size + mtime as a stable-ish id without hashing file bytes
    const stat = fs.statSync(filePath);
    return `${path.basename(filePath)}|${stat.size}|${stat.mtimeMs}`;
}

function main() {
    ensureExiftool();
    const exif = readExifJson();

    // Group by stack id inferred from filename (first 's' after digits). If none, it’s a cover-only stack.
    const coverRe = /^photo(\d+)\.(jpe?g|png|gif|webp)$/i;
    const subRe = /^photo(\d+)s.+\.(jpe?g|png|gif|webp)$/i;

    const stacks = new Map(); // id -> { cover?, subs: [] }

    for (const rec of exif) {
        const fileAbs = rec.SourceFile;
        const file = path.basename(fileAbs);
        const iso = toIsoDate(rec);
        let camera = rec.Model || rec['Camera Model Name'] || '';
        if (camera && /G7 X/i.test(camera)) camera = 'Canon G7X Mark III';
        if (camera && /DMC-FX3/i.test(camera)) camera = 'Panasonic DMC-FX3';

        const aperture = rec.FNumber ? `f/${rec.FNumber}` : '';
        const shutter = rec.ExposureTime ? `${rec.ExposureTime}${/s$/.test(String(rec.ExposureTime)) ? '' : 's'}` : '';
        const isoStr = rec.ISO ? `ISO ${rec.ISO}` : '';

        let m = file.match(coverRe);
        if (m) {
            const id = m[1];
            if (!stacks.has(id)) stacks.set(id, { id, cover: null, subs: [] });
            stacks.get(id).cover = { file, date: iso, camera, aperture, shutter, iso: isoStr, key: hashKey(fileAbs) };
            continue;
        }
        m = file.match(subRe);
        if (m) {
            const id = m[1];
            if (!stacks.has(id)) stacks.set(id, { id, cover: null, subs: [] });
            stacks.get(id).subs.push({ file, date: iso });
            continue;
        }
        // Non-photo* files become their own single-image stack with a synthetic id
        const synth = `x_${file}`;
        stacks.set(synth, { id: synth, cover: { file, date: iso, camera, aperture, shutter, iso: isoStr, key: hashKey(fileAbs) }, subs: [] });
    }

    // Build manifest entries (filter invalid – must have a cover)
    const entries = [];
    for (const [, s] of stacks) {
        if (!s.cover) continue;
        s.subs.sort((a, b) => (new Date(a.date || 0)) - (new Date(b.date || 0)));
        entries.push({ id: String(s.id), cover: s.cover, subs: s.subs });
    }

    // Sort stacks by cover date desc (newest first). Missing dates go last.
    entries.sort((a, b) => (new Date(b.cover.date || 0)) - (new Date(a.cover.date || 0)));

    fs.writeFileSync(MANIFEST, JSON.stringify({ version: 1, items: entries }, null, 2), 'utf8');
    console.log(`Wrote ${MANIFEST} with ${entries.length} item(s).`);
}

main();


