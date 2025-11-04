Photo Portfolio: https://shantrm.github.io/photo-portfolio/

Simple two-page photo site (gallery + about) with a lightbox and map.

## Adding or Removing Photos

1) Add or remove files in `images/`.
2) Update the site:
```bash
node refresh-gallery.js
```

This will:
- Normalize file extensions
- Build the manifest from EXIF data
- Rename files to match manifest order
- Generate the gallery HTML

## Adding Sub-Photos (Albums)

Choose one:
- Name subs like `photo<number>s*.*` (e.g., `photo14s1.JPG`, `photo14s2.JPG`) and run:
  ```bash
  node refresh-gallery.js
  ```
- Or edit `gallery.json` and add files to the cover's `subs` array, then run:
  ```bash
  node generate-gallery-from-manifest.js
  ```

## Adding Location Data

To add location coordinates and titles to photos:

1) Edit `gallery.json` and add to the cover object:
```json
{
  "cover": {
    "file": "photo1.jpeg",
    ...
    "locationTitle": "Location Name",
    "coordinates": [latitude, longitude]
  }
}
```

2) Regenerate the gallery HTML:
```bash
node generate-gallery-from-manifest.js
```

**Important:** If you add new photos, run `node refresh-gallery.js` first (which rebuilds the manifest from EXIF data), then add your location data to `gallery.json`, then run `node generate-gallery-from-manifest.js` to update the HTML. Running `refresh-gallery.js` will overwrite `gallery.json` and remove any manually added location data.

