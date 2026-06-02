# Scene Thumbnails (background-vibe selector)

These are the background images for the four **background vibe** buttons in
`contextconfiguration.jsx`'s 2×2 selector. They are display-only — full
countertop / scene photos that visually communicate each vibe to the vendor.

They are **not** sent to any API. Background generation is text-only: the LLM
turns the selected vibe into a `backgroundPrompt` that Photoroom renders. (The
old Phase 6.7.3 image-guidance flow — duplicating these into the backend and
sending them as `background.guidance.imageFile` — was removed.)

## Files

- `kopitiam.jpg`
- `cafe.jpg`
- `street.jpg`
- `premium.jpg`

## How they're loaded

`contextconfiguration.jsx` uses `import.meta.glob('../assets/scenes/*.jpg')` to
discover whatever files are present here, so Vite hashes them into the bundle.
Missing files don't break the build — that tile falls back to its gradient +
label rendering.

## Specs

- A full scene/countertop photo that reads the vibe at a glance (kopitiam
  marble + fluorescent, cafe oak + warm window light, street steel + neon
  bokeh, premium walnut/slate + soft studio light).
- JPEG, ~50–100KB, ~1024px on the long edge. They render as square tiles
  (`object-cover`) with a dark label bar across the bottom.
