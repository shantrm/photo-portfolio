#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const IMAGES_DIR = path.join(__dirname, 'images');
const INDEX_FILE = path.join(__dirname, 'index.html');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Get EXIF data from image
function getExifData(filePath) {
    try {
        const output = execSync(
            `exiftool -Make -Model -FNumber -ExposureTime -ISO -DateTimeOriginal "${filePath}"`,
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        );

        const data = {
            camera: '',
            aperture: '',
            shutter: '',
            iso: '',
            date: ''
        };

        const lines = output.split('\n');
        lines.forEach(line => {
            if (line.includes('Make') && !line.includes('Model')) {
                data.make = line.split(':')[1]?.trim();
            }
            if (line.includes('Camera Model Name')) {
                data.model = line.split(':')[1]?.trim();
            }
            if (line.includes('F Number')) {
                const fnum = line.split(':')[1]?.trim();
                data.aperture = fnum ? `f/${fnum}` : '';
            }
            if (line.includes('Exposure Time')) {
                data.shutter = line.split(':')[1]?.trim() + 's';
            }
            if (line.includes('ISO') && !line.includes('ISO Speed')) {
                data.iso = 'ISO ' + line.split(':')[1]?.trim();
            }
            if (line.includes('Date/Time Original')) {
                const dateStr = line.split(':').slice(1).join(':').trim();
                data.date = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
            }
        });

        // Format camera name
        if (data.model) {
            // Simplify camera names
            if (data.model.includes('G7 X')) {
                data.camera = 'Canon G7X Mark III';
            } else if (data.model.includes('DMC-FX3')) {
                data.camera = 'Panasonic DMC-FX3';
            } else {
                data.camera = data.model;
            }
        }

        return data;
    } catch (error) {
        return null;
    }
}

// Read all image files from the images directory
function getImageFiles() {
    try {
        const files = fs.readdirSync(IMAGES_DIR);
        return files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return IMAGE_EXTENSIONS.includes(ext);
            })
            .sort((a, b) => {
                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            });
    } catch (error) {
        console.error(`Error reading images directory: ${error.message}`);
        return [];
    }
}

// Generate gallery HTML for image files with EXIF data
function generateGalleryHTML(imageFiles) {
    if (imageFiles.length === 0) {
        return `            <!-- No images found in the images folder -->`;
    }

    return imageFiles.map((filename, index) => {
        const photoNumber = index + 1;
        const filePath = path.join(IMAGES_DIR, filename);
        const exif = getExifData(filePath);

        if (exif && exif.camera) {
            const settings = [exif.aperture, exif.shutter, exif.iso].filter(Boolean).join(', ');

            return `            <div class="gallery-item" 
                data-camera="${exif.camera}" 
                data-settings="${settings}" 
                data-date="${exif.date}">
                <img src="images/${filename}" alt="Photo ${photoNumber}" loading="lazy">
            </div>`;
        } else {
            return `            <div class="gallery-item">
                <img src="images/${filename}" alt="Photo ${photoNumber}" loading="lazy">
            </div>`;
        }
    }).join('\n\n');
}

// Update the index.html file with new gallery content
function updateIndexHTML(galleryHTML) {
    try {
        let html = fs.readFileSync(INDEX_FILE, 'utf8');

        const galleryStartMarker = '<div class="gallery">';
        const galleryEndMarker = '</div>\n    </main>';

        const startIdx = html.indexOf(galleryStartMarker);
        const endIdx = html.indexOf(galleryEndMarker, startIdx);

        if (startIdx === -1 || endIdx === -1) {
            console.error('Could not find gallery section in index.html');
            return false;
        }

        const before = html.substring(0, startIdx + galleryStartMarker.length);
        const after = html.substring(endIdx);

        const newHTML = `${before}
            <!-- Auto-generated gallery with EXIF metadata -->

${galleryHTML}
        ${after}`;

        fs.writeFileSync(INDEX_FILE, newHTML, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error updating index.html: ${error.message}`);
        return false;
    }
}

// Main execution
console.log('📸 Gallery Generator with EXIF Data');
console.log('===================================\n');

// Check if exiftool is available
try {
    execSync('which exiftool', { stdio: 'ignore' });
    console.log('✅ exiftool found\n');
} catch (e) {
    console.log('❌ exiftool not found!');
    console.log('   Install it with: brew install exiftool\n');
    process.exit(1);
}

console.log('🔍 Scanning for images and reading EXIF data...\n');
const imageFiles = getImageFiles();

if (imageFiles.length > 0) {
    console.log(`📸 Found ${imageFiles.length} image(s):\n`);

    // Show summary
    imageFiles.forEach((file, idx) => {
        const filePath = path.join(IMAGES_DIR, file);
        const exif = getExifData(filePath);
        if (exif && exif.camera) {
            console.log(`   ${(idx + 1).toString().padStart(2)}. ${file.padEnd(20)} → ${exif.camera}`);
        } else {
            console.log(`   ${(idx + 1).toString().padStart(2)}. ${file.padEnd(20)} → No EXIF data`);
        }
    });

    console.log('\n✨ Generating gallery HTML with EXIF metadata...');
    const galleryHTML = generateGalleryHTML(imageFiles);

    console.log('📝 Updating index.html...');
    if (updateIndexHTML(galleryHTML)) {
        console.log('✅ Gallery updated successfully!\n');
        console.log('📷 EXIF data included: Camera, Aperture, Shutter Speed, ISO, Date\n');
    } else {
        console.log('❌ Failed to update gallery.\n');
    }
} else {
    console.log('⚠️  No images found in the images folder.\n');
}

