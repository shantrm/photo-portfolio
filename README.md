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

Location data (coordinates and location titles) is stored in `locations.json` to prevent it from being lost when refreshing the gallery.

### Adding or Editing Locations

1) Edit `locations.json` and add entries for photo files:
```json
{
  "locations": {
    "photo1.jpeg": {
      "coordinates": [42.27554497039414, -83.7394577157334],
      "locationTitle": "Tappan Hall, Ann Arbor, MI"
    },
    "photo2.jpeg": {
      "coordinates": [42.26978060872995, -83.73825853389415],
      "locationTitle": "Arch St, Ann Arbor, MI"
    }
  }
}
```

2) Run the refresh script to merge location data into the manifest:
```bash
node refresh-gallery.js
```

Or if you just want to update the HTML without rebuilding:
```bash
node generate-gallery-from-manifest.js
```

### Workflow

- Adding new photos with locations: 
  1. Add photos to `images/`
  2. Run `node refresh-gallery.js` (rebuilds manifest from EXIF)
  3. Add location data to `locations.json` for the new photos
  4. Run `node refresh-gallery.js` again (merges locations into manifest)
  5. Run `node generate-gallery-from-manifest.js` (updates HTML)

- Adding locations to existing photos:
  1. Edit `locations.json` with the location data
  2. Run `node refresh-gallery.js` (merges locations) OR `node generate-gallery-from-manifest.js` (just updates HTML)

