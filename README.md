# Photo Portfolio

https://shantrm.github.io/photo-portfolio/

## Updating the Gallery

1. Add or remove photos in `images/`
2. Run:
```bash
node refresh-gallery.js
```

The script handles extension normalization, EXIF extraction, file renaming, and HTML generation.

## Adding Location Data

Edit `locations.json`:
```json
{
  "locations": {
    "photo1.jpeg": {
      "coordinates": [42.275, -83.739],
      "locationTitle": "Ann Arbor, MI"
    }
  }
}
```

Then run `node refresh-gallery.js` to apply.

## Requirements

- Node.js
- exiftool (`brew install exiftool`)
