Photo Portfolio: https://shantrm.github.io/photo-portfolio/

Simple two-page photo site (gallery + about) with a lightbox.

Add or delete photos

1) Add or remove files in `images/`.
2) Update the site:
```bash
node refresh-gallery.js
```

Add sub-photos (albums)

Choose one:
- Name subs like `photo<number>s*.*` (e.g., `photo14s1.JPG`, `photo14s2.JPG`) and run:
  ```bash
  node refresh-gallery.js
  ```
- Or edit `gallery.json` and add files to the cover’s `subs` array, then run the same command.

