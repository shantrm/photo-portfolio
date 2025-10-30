# Photography Portfolio Website

A minimal, elegant photography portfolio website with two pages and a lightbox feature.

## Setup Instructions

### Adding Your Photos (Automatic Method) ⭐

1. **Place your photos** in the `images/` folder
   - Recommended format: JPG or PNG
   - Recommended size: 1920px width or larger for best quality
   - Name them anything you like: `sunset.jpg`, `mountains.jpg`, etc.

2. **Organize photos chronologically** (newest to oldest):
   ```bash
   node rename-photos.js
   ```
   This will rename all photos to photo1.jpg, photo2.jpg, etc. based on when they were taken!

3. **Generate gallery with EXIF data**:
   ```bash
   node generate-gallery-with-exif.js
   ```
   This automatically extracts camera settings from your photos and updates `index.html`!
   
   **EXIF data included:**
   - Camera model (Panasonic DMC-FX3 or Canon G7X Mark III)
   - Settings (aperture, shutter speed, ISO)
   - Date taken

### Adding Your Photos (Manual Method)

1. **Place your photos** in the `images/` folder

2. **Update the gallery** in `index.html`:
   - Find the gallery section (around line 20)
   - For each photo, add a gallery item:
     - `src="images/your-photo-name.jpg"` - Path to your photo
     - `data-title` - Title of the photo
     - `data-camera` - Camera model used
     - `data-lens` - Lens used
     - `data-settings` - Camera settings (f/stop, shutter speed, ISO)
     - `data-location` - Where the photo was taken
     - `alt` - Alt text (usually same as title)

### Example Photo Entry

```html
<div class="gallery-item" 
     data-title="Sunset at the Beach" 
     data-camera="Canon EOS R5" 
     data-lens="50mm f/1.2" 
     data-settings="f/2.0, 1/1000s, ISO 100" 
     data-location="Malibu, California">
    <img src="images/sunset-beach.jpg" alt="Sunset at the Beach" loading="lazy">
</div>
```

### Customizing the About Page

Edit `about.html` to add:
- Your own bio and story
- Your profile photo (place in `images/` folder)
- Your contact email

### Opening the Website

Simply open `index.html` in your web browser. No server required!

## Features

- ✨ Ultra-minimal design with clean typography
- 📱 Fully responsive (works on all devices)
- 🖼️ Click photos to zoom and view metadata
- ⌨️ Keyboard navigation (arrow keys, ESC to close)
- 🎯 Simple, distraction-free layout

## File Structure

```
photography-website/
├── index.html                      # Main gallery page
├── about.html                      # About page
├── style.css                       # All styling (dark theme)
├── script.js                       # Lightbox functionality
├── generate-gallery-with-exif.js   # ⭐ Generate gallery with EXIF metadata
├── rename-photos.js                # Organize photos chronologically
├── images/                         # Your photos go here
└── README.md                       # This file
```

## Tips

- Keep your photo file sizes reasonable (under 2MB each) for faster loading
- Use consistent naming for your photos
- The metadata will display when someone clicks a photo
- Add or remove gallery items as needed by copying the div structure

