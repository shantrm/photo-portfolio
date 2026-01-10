#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const IMAGES = path.join(ROOT, 'images');
const MANIFEST = path.join(ROOT, 'gallery.json');
const LOCATIONS = path.join(ROOT, 'locations.json');
const INDEX_FILE = path.join(ROOT, 'index.html');

// ─────────────────────────────────────────────────────────────
// Step 1: Normalize extensions (.jpg/.JPG -> .jpeg)
// ─────────────────────────────────────────────────────────────

function normalizeExtensions() {
    const files = fs.readdirSync(IMAGES);
    let count = 0;

    for (const f of files) {
        const ext = path.extname(f);
        if (!ext) continue;
        const lower = ext.toLowerCase();
        if (lower === '.jpg' || lower === '.jpeg' || lower === '.jpe') {
            const to = f.slice(0, -ext.length) + '.jpeg';
            if (to !== f) {
                const src = path.join(IMAGES, f);
                const dst = path.join(IMAGES, to);
                const sameInsensitive = src.toLowerCase() === dst.toLowerCase();
                if (fs.existsSync(dst) && !sameInsensitive) {
                    try { fs.unlinkSync(dst); } catch { }
                }
                if (sameInsensitive && src !== dst) {
                    const tmp = `${dst}.tmpcase`;
                    fs.renameSync(src, tmp);
                    fs.renameSync(tmp, dst);
                } else {
                    fs.renameSync(src, dst);
                }
                console.log(`  renamed: ${f} -> ${to}`);
                count++;
            }
        }
    }
    return count;
}

// ─────────────────────────────────────────────────────────────
// Step 2: Build manifest from EXIF data
// ─────────────────────────────────────────────────────────────

function ensureExiftool() {
    try { execSync('exiftool -ver', { stdio: 'ignore' }); }
    catch { console.error('exiftool not found. Install with: brew install exiftool'); process.exit(1); }
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
    const stat = fs.statSync(filePath);
    return `${path.basename(filePath)}|${stat.size}|${stat.mtimeMs}`;
}

function buildManifest() {
    ensureExiftool();
    const exif = readExifJson();

    const coverRe = /^photo(\d+)\.(jpe?g|png|gif|webp)$/i;
    const subRe = /^photo(\d+)s.+\.(jpe?g|png|gif|webp)$/i;
    const stacks = new Map();

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
        const synth = `x_${file}`;
        stacks.set(synth, { id: synth, cover: { file, date: iso, camera, aperture, shutter, iso: isoStr, key: hashKey(fileAbs) }, subs: [] });
    }

    const entries = [];
    for (const [, s] of stacks) {
        if (!s.cover) continue;
        entries.push({ id: String(s.id), cover: s.cover, subs: s.subs });
    }

    entries.sort((a, b) => (new Date(b.cover.date || 0)) - (new Date(a.cover.date || 0)));

    // Merge location data
    if (fs.existsSync(LOCATIONS)) {
        try {
            const locationsData = JSON.parse(fs.readFileSync(LOCATIONS, 'utf8'));
            const locations = locationsData.locations || {};
            entries.forEach(item => {
                if (locations[item.cover.file]) {
                    const loc = locations[item.cover.file];
                    if (loc.coordinates) item.cover.coordinates = loc.coordinates;
                    if (loc.locationTitle) item.cover.locationTitle = loc.locationTitle;
                }
                if (item.subs) {
                    item.subs.forEach(sub => {
                        if (locations[sub.file]) {
                            const loc = locations[sub.file];
                            if (loc.coordinates) sub.coordinates = loc.coordinates;
                            if (loc.locationTitle) sub.locationTitle = loc.locationTitle;
                        }
                    });
                }
            });
            console.log('  merged location data');
        } catch (err) {
            console.warn(`  warning: could not parse locations.json: ${err.message}`);
        }
    }

    return entries;
}

// ─────────────────────────────────────────────────────────────
// Step 3: Rename files to match manifest order
// ─────────────────────────────────────────────────────────────

function renameToManifestOrder(items) {
    const plan = [];
    const updateRefs = [];

    items.forEach((it, idx) => {
        const newId = idx + 1;
        const coverFrom = it.cover.file;
        const coverTo = `photo${newId}${path.extname(coverFrom)}`;
        if (coverFrom !== coverTo) {
            plan.push({ from: coverFrom, to: coverTo });
            updateRefs.push(() => { it.cover.file = coverTo; });
        }
        (it.subs || []).forEach((s, k) => {
            const from = s.file;
            const to = `photo${newId}s${k + 1}${path.extname(from)}`;
            if (from !== to) {
                plan.push({ from, to });
                updateRefs.push(() => { s.file = to; });
            }
        });
    });

    if (plan.length === 0) return 0;

    // Move to temps first to avoid collisions
    const temps = [];
    for (const { from } of plan) {
        const absFrom = path.join(IMAGES, from);
        if (!fs.existsSync(absFrom)) continue;
        const tmp = `${path.basename(from, path.extname(from))}.tmp-${Math.random().toString(36).slice(2, 8)}${path.extname(from)}`;
        fs.renameSync(absFrom, path.join(IMAGES, tmp));
        temps.push({ tmp, from });
    }

    // Move temps to final
    for (const { from, to } of plan) {
        const tmpRec = temps.find(t => t.from === from);
        if (!tmpRec) continue;
        const absTmp = path.join(IMAGES, tmpRec.tmp);
        const absTo = path.join(IMAGES, to);
        if (fs.existsSync(absTo)) {
            const backup = `${path.basename(to, path.extname(to))}.bak${path.extname(to)}`;
            fs.renameSync(absTo, path.join(IMAGES, backup));
        }
        fs.renameSync(absTmp, absTo);
    }

    updateRefs.forEach(fn => fn());
    return plan.length;
}

// ─────────────────────────────────────────────────────────────
// Step 4: Generate gallery HTML
// ─────────────────────────────────────────────────────────────

function renderItems(items) {
    return items.map((it, idx) => {
        const settings = [it.cover.aperture, it.cover.shutter, it.cover.iso].filter(Boolean).join(', ');
        const date = it.cover.date || '';
        const camera = it.cover.camera || '';
        const locationTitle = it.cover.locationTitle || '';
        const coordinates = it.cover.coordinates ? it.cover.coordinates.join(',') : '';
        const stackAttr = it.subs && it.subs.length > 0 ? ` has-stack" data-stack="${it.id}` : '';
        const cover = `            <div class="gallery-item${stackAttr}"
                data-camera="${camera}"
                data-settings="${settings}"
                data-date="${date}"
                data-location-title="${locationTitle}"
                data-coordinates="${coordinates}">
                <img src="images/${it.cover.file}" alt="Photo ${idx + 1}" loading="lazy">
            </div>`;

        if (!it.subs || it.subs.length === 0) return cover;
        const subsBlock = `            <div class="gallery-sub" data-stack="${it.id}" style="display:none">
${it.subs.map(s => `                <img src="images/${s.file}" alt="${s.file}">`).join('\n')}
            </div>`;
        return `${cover}\n\n${subsBlock}`;
    }).join('\n\n');
}

function updateIndexHTML(items) {
    const galleryHTML = renderItems(items);
    let html = fs.readFileSync(INDEX_FILE, 'utf8');

    const galleryStartMarker = '<div class="gallery">';
    const galleryEndMarker = '</div>\n    </main>';

    const startIdx = html.indexOf(galleryStartMarker);
    const endIdx = html.indexOf(galleryEndMarker, startIdx);
    if (startIdx === -1 || endIdx === -1) {
        console.error('Could not find gallery section in index.html');
        process.exit(1);
    }

    const before = html.substring(0, startIdx + galleryStartMarker.length);
    const after = html.substring(endIdx);
    const newHTML = `${before}
            <!-- Auto-generated gallery from manifest -->

${galleryHTML}
        ${after}`;
    fs.writeFileSync(INDEX_FILE, newHTML, 'utf8');
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

function main() {
    console.log('Refreshing gallery...\n');

    console.log('1. Normalizing extensions...');
    const normalized = normalizeExtensions();
    console.log(`   ${normalized} file(s) renamed\n`);

    console.log('2. Building manifest from EXIF...');
    const items = buildManifest();
    console.log(`   ${items.length} photo(s) found\n`);

    console.log('3. Renaming files to match order...');
    const renamed = renameToManifestOrder(items);
    console.log(`   ${renamed} file(s) renamed\n`);

    console.log('4. Updating index.html...');
    fs.writeFileSync(MANIFEST, JSON.stringify({ version: 1, items }, null, 2), 'utf8');
    updateIndexHTML(items);
    console.log('   done\n');

    console.log('Gallery refreshed successfully!');
}

main();
