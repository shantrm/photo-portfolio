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
    if (lower === '.jpg') return null; // already good
    if (lower === '.jpeg' || lower === '.jpg' || lower === '.jpe') return name.slice(0, -ext.length) + '.jpg';
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
        const dst = path.join(IMAGES, to);
        if (fs.existsSync(dst)) {
            // if destination exists and is same inode/size, remove it first
            try { fs.unlinkSync(dst); } catch { }
        }
        fs.renameSync(src, dst);
        console.log(`renamed: ${from} -> ${to}`);
    }

    // update gallery.json if present
    if (fs.existsSync(MANIFEST)) {
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


