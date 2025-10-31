#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IMAGES = path.join(ROOT, 'images');
const MANIFEST = path.join(ROOT, 'gallery.json');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

function ext(name) { return path.extname(name); }
function base(name) { return path.basename(name, ext(name)); }

function tempName(name) {
    const id = Math.random().toString(36).slice(2, 8);
    return `${base(name)}.tmp-${id}${ext(name)}`;
}

function main() {
    if (!fs.existsSync(MANIFEST)) {
        console.error('gallery.json not found. Run build-manifest.js first.');
        process.exit(1);
    }
    const manifest = readJson(MANIFEST);
    const items = manifest.items || [];

    // Build planned renames based on manifest order (index):
    // cover: photo<idx+1>.<ext>
    // subs:  photo<idx+1>s<k>.<ext> (k is 1-based in the order listed)
    const plan = []; // { from, to }
    const updateRefs = []; // functions to update manifest paths after rename

    items.forEach((it, idx) => {
        const newId = idx + 1;
        // cover
        const coverFrom = it.cover.file; // e.g., foo.jpg
        const coverTo = `photo${newId}${ext(coverFrom)}`;
        if (coverFrom !== coverTo) {
            plan.push({ from: coverFrom, to: coverTo });
            updateRefs.push(() => { it.cover.file = coverTo; });
        }
        // subs
        (it.subs || []).forEach((s, k) => {
            const from = s.file;
            const to = `photo${newId}s${k + 1}${ext(from)}`;
            if (from !== to) {
                plan.push({ from, to });
                updateRefs.push(() => { s.file = to; });
            }
        });
    });

    if (plan.length === 0) {
        console.log('No renames needed based on manifest order.');
        return;
    }

    // Collision-safe: move all to temps first
    const temps = [];
    for (const { from } of plan) {
        const absFrom = path.join(IMAGES, from);
        if (!fs.existsSync(absFrom)) continue; // skip missing silently
        const tmp = tempName(from);
        fs.renameSync(absFrom, path.join(IMAGES, tmp));
        temps.push({ tmp, from });
    }

    // Move temps to final
    for (const { from, to } of plan) {
        const tmpRec = temps.find(t => t.from === from);
        if (!tmpRec) continue;
        const absTmp = path.join(IMAGES, tmpRec.tmp);
        const absTo = path.join(IMAGES, to);
        // If a file already exists at target and wasn't part of temp set, back it up
        if (fs.existsSync(absTo)) {
            const backup = path.join(IMAGES, `${base(to)}.bak${ext(to)}`);
            fs.renameSync(absTo, backup);
        }
        fs.renameSync(absTmp, absTo);
    }

    // Update manifest references
    updateRefs.forEach(fn => fn());
    writeJson(MANIFEST, manifest);
    console.log(`Renamed ${plan.length} file(s) to match manifest order and updated gallery.json.`);
}

main();


