#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IMAGES = path.join(ROOT, 'images');
const MANIFEST = path.join(ROOT, 'gallery.json');

function normalizeToJpg(name) {
    const ext = path.extname(name);
    if (!ext) return null;
    const lower = ext.toLowerCase();
    if (lower === '.jpg' || lower === '.jpeg' || lower === '.jpe') {
        return name.slice(0, -ext.length) + '.jpeg';
    }
    // skip non-jpeg types to avoid breaking transparency or formats
    return null;
}

function main() {
    const files = fs.readdirSync(IMAGES);
    const renames = [];
    for (const f of files) {
        const to = normalizeToJpg(f);
        if (to && to !== f) renames.push({ from: f, to });
    }

    // perform renames (handle collisions by deleting existing exact-duplicate target)
    for (const { from, to } of renames) {
        const src = path.join(IMAGES, from);
        if (!fs.existsSync(src)) continue;
        const dst = path.join(IMAGES, to);
        const sameInsensitive = src.toLowerCase() === dst.toLowerCase();
        if (fs.existsSync(dst) && !sameInsensitive) {
            // if destination exists and is different file, remove it first
            try { fs.unlinkSync(dst); } catch { }
        }
        if (sameInsensitive && src !== dst) {
            const tmp = `${dst}.tmpcase`; // temporary hop for case-only rename
            fs.renameSync(src, tmp);
            fs.renameSync(tmp, dst);
        } else {
            fs.renameSync(src, dst);
        }
        console.log(`renamed: ${from} -> ${to}`);
    }

    // update gallery.json if present
    if (renames.length && fs.existsSync(MANIFEST)) {
        const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
        let changed = false;
        const map = new Map(renames.map(r => [r.from, r.to]));
        for (const it of manifest.items || []) {
            if (map.has(it.cover.file)) { it.cover.file = map.get(it.cover.file); changed = true; }
            for (const s of it.subs || []) {
                if (map.has(s.file)) { s.file = map.get(s.file); changed = true; }
            }
        }
        if (changed) {
            fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
            console.log('Updated gallery.json references.');
        }
    }
}

main();


