#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const INDEX_FILE = path.join(ROOT, 'index.html');
const MANIFEST = path.join(ROOT, 'gallery.json');

function loadManifest() {
    if (!fs.existsSync(MANIFEST)) {
        console.error('gallery.json not found. Run build-manifest.js first.');
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
}

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

        // Hidden stack block if needed
        if (!it.subs || it.subs.length === 0) return cover;
        const subsBlock = `            <div class="gallery-sub" data-stack="${it.id}" style="display:none">
${it.subs.map(s => `                <img src="images/${s.file}" alt="${s.file}">`).join('\n')}
            </div>`;
        return `${cover}\n\n${subsBlock}`;
    }).join('\n\n');
}

function updateIndexHTML(galleryHTML) {
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

function main() {
    const manifest = loadManifest();
    const items = manifest.items || [];
    const html = renderItems(items);
    updateIndexHTML(html);
    console.log(`Updated index.html from gallery.json (${items.length} items).`);
}

main();

