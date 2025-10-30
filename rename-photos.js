#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const IMAGES_DIR = path.join(__dirname, 'images');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Get EXIF date from image using exiftool (if available) or file stats
function getPhotoDate(filePath) {
    try {
        // Try to use exiftool if available (most accurate)
        try {
            const output = execSync(`exiftool -DateTimeOriginal -s3 "${filePath}"`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();

            if (output) {
                // Parse EXIF date format: "2023:10:15 14:30:45"
                const dateStr = output.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        } catch (e) {
            // exiftool not available or failed, fall back to file stats
        }

        // Fallback to file creation time
        const stats = fs.statSync(filePath);
        return stats.birthtime || stats.mtime;
    } catch (error) {
        console.error(`Error reading date for ${path.basename(filePath)}: ${error.message}`);
        return new Date(0); // Return epoch time if all else fails
    }
}

// Get all image files with their dates
function getImageFilesWithDates() {
    try {
        const files = fs.readdirSync(IMAGES_DIR);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return IMAGE_EXTENSIONS.includes(ext) && file !== 'README.md';
        });

        console.log(`\n📸 Found ${imageFiles.length} photo(s) in images folder`);
        console.log('📅 Reading dates from photos...\n');

        const filesWithDates = imageFiles.map(filename => {
            const filePath = path.join(IMAGES_DIR, filename);
            const date = getPhotoDate(filePath);
            const ext = path.extname(filename).toLowerCase();

            console.log(`   ${filename.padEnd(30)} → ${date.toLocaleString()}`);

            return {
                originalName: filename,
                originalPath: filePath,
                date: date,
                extension: ext
            };
        });

        // Sort by date (newest first)
        filesWithDates.sort((a, b) => b.date - a.date);

        return filesWithDates;
    } catch (error) {
        console.error(`Error reading images directory: ${error.message}`);
        return [];
    }
}

// Rename files sequentially
function renamePhotos(filesWithDates) {
    if (filesWithDates.length === 0) {
        console.log('\n⚠️  No photos to rename.');
        return false;
    }

    console.log('\n🔄 Renaming photos chronologically...\n');

    // First, rename to temporary names to avoid conflicts
    const tempRenames = [];
    filesWithDates.forEach((file, index) => {
        const tempName = `__temp_${index}${file.extension}`;
        const tempPath = path.join(IMAGES_DIR, tempName);

        try {
            fs.renameSync(file.originalPath, tempPath);
            tempRenames.push({
                tempPath: tempPath,
                finalName: `photo${index + 1}${file.extension}`,
                originalName: file.originalName,
                date: file.date
            });
        } catch (error) {
            console.error(`Error creating temp file for ${file.originalName}: ${error.message}`);
        }
    });

    // Then rename to final names
    tempRenames.forEach((file, index) => {
        const finalPath = path.join(IMAGES_DIR, file.finalName);

        try {
            fs.renameSync(file.tempPath, finalPath);
            console.log(`   ✓ ${file.originalName.padEnd(30)} → ${file.finalName.padEnd(20)} (${file.date.toLocaleDateString()})`);
        } catch (error) {
            console.error(`Error renaming to ${file.finalName}: ${error.message}`);
        }
    });

    return true;
}

// Main execution
console.log('🔍 Photography Organizer');
console.log('========================');

// Check if exiftool is available
let hasExiftool = false;
try {
    execSync('which exiftool', { stdio: 'ignore' });
    hasExiftool = true;
    console.log('✅ Using exiftool for accurate EXIF dates');
} catch (e) {
    console.log('⚠️  exiftool not found - using file creation dates');
    console.log('   (Install exiftool for accurate photo dates: brew install exiftool)');
}

const filesWithDates = getImageFilesWithDates();

if (filesWithDates.length > 0) {
    console.log('\n📊 Chronological order (newest → oldest):');
    filesWithDates.forEach((file, index) => {
        console.log(`   ${(index + 1).toString().padStart(2)}. ${file.originalName.padEnd(30)} ${file.date.toLocaleString()}`);
    });

    console.log('\n⚠️  This will rename all photos to photo1.jpg, photo2.jpg, etc.');
    console.log('   Press Ctrl+C now to cancel, or wait 3 seconds to continue...');

    // Give user time to cancel
    setTimeout(() => {
        if (renamePhotos(filesWithDates)) {
            console.log('\n✅ All photos renamed successfully!');
            console.log('💡 Run "node generate-gallery.js" to update your gallery.\n');
        } else {
            console.log('\n❌ Failed to rename photos.\n');
        }
    }, 3000);
} else {
    console.log('\n⚠️  No photos found in the images folder.');
    console.log('   Add some photos and try again.\n');
}

