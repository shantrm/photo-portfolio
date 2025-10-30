#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const IMAGES_DIR = path.join(__dirname, 'images');
const INDEX_FILE = path.join(__dirname, 'index.html');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

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
                // Natural sort (photo1, photo2, photo10 instead of photo1, photo10, photo2)
                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            });
    } catch (error) {
        console.error(`Error reading images directory: ${error.message}`);
        return [];
    }
}

// Generate gallery HTML for image files
function generateGalleryHTML(imageFiles) {
    if (imageFiles.length === 0) {
        return `            <!-- No images found in the images folder -->
            <!-- Add photos to the 'images' folder and run: node generate-gallery.js -->`;
    }

    return imageFiles.map((filename, index) => {
        const photoNumber = index + 1;
        const photoName = path.parse(filename).name;
        const prettyName = photoName
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());

        return `            <div class="gallery-item" data-title="${prettyName}" data-camera="Camera Model" data-lens="Lens"
                data-settings="Aperture, Shutter, ISO" data-location="Location">
                <img src="images/${filename}" alt="${prettyName}" loading="lazy">
            </div>`;
    }).join('\n\n');
}

// Update the index.html file with new gallery content
function updateIndexHTML(galleryHTML) {
    try {
        let html = fs.readFileSync(INDEX_FILE, 'utf8');

        // Find the gallery div and replace its contents
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
            <!-- Auto-generated gallery - edit using generate-gallery.js -->
            <!-- Add your photos here - place them in the 'images' folder and update the paths below -->
            <!-- Example format:
            <div class="gallery-item" data-title="Photo Title" data-camera="Camera Model" data-lens="Lens" 
                data-settings="f/stop, shutter, ISO" data-location="Location">
                <img src="images/your-photo.jpg" alt="Photo Title" loading="lazy">
            </div>
            -->

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
console.log('🔍 Scanning for images...');
const imageFiles = getImageFiles();

console.log(`📸 Found ${imageFiles.length} image(s):`);
imageFiles.forEach((file, idx) => {
    console.log(`   ${idx + 1}. ${file}`);
});

if (imageFiles.length > 0) {
    console.log('\n✨ Generating gallery HTML...');
    const galleryHTML = generateGalleryHTML(imageFiles);

    console.log('📝 Updating index.html...');
    if (updateIndexHTML(galleryHTML)) {
        console.log('✅ Gallery updated successfully!');
        console.log(`\n💡 Tip: Edit the data-title, data-camera, data-lens, data-settings, and data-location`);
        console.log('   attributes in index.html to customize each photo\'s metadata.\n');
    } else {
        console.log('❌ Failed to update gallery.');
    }
} else {
    console.log('\n⚠️  No images found. Add photos to the "images" folder and run this script again.');
    console.log('   Supported formats: .jpg, .jpeg, .png, .gif, .webp\n');
}

