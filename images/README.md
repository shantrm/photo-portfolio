# Images Folder

Place your photography files in this folder.

## Quick Start (Automatic) ⭐

1. **Copy your photos** into this `images` folder
   - Name them anything: `sunset.jpg`, `beach.jpg`, etc.
   
2. **Run the generator** from the main folder:
   ```bash
   node generate-gallery.js
   ```
   
3. **Done!** Your gallery will be automatically updated

## Manual Method

1. **Copy your photos** into this `images` folder
2. **Name them** something simple like:
   - `photo1.jpg`
   - `photo2.jpg`
   - `photo3.jpg`
   - etc.

3. **Update `index.html`** to match your photo filenames and add metadata

## Recommended Image Specs

- **Format**: JPG or PNG
- **Resolution**: 1920px width or larger recommended
- **File size**: Keep under 2MB each for faster loading
- **Aspect ratio**: Any ratio works, but 4:3 or 3:2 are standard for photography

## Example

If you have a photo called `sunset-beach.jpg` in this folder, reference it in `index.html` like this:

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

You can delete this README file once you've added your photos.

