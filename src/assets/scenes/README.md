# Scene Thumbnails (frontend bundle)

These are the **same images** as `snapit-backend/assets/scenes/`, duplicated here so Vite hashes them into the frontend bundle. Tiny (~50KB) → bundle cost is trivial vs. zero-flicker tile rendering.

## Required files

- `kopitiam.jpg`
- `cafe.jpg`
- `street.jpg`
- `premium.jpg`

## How they're loaded

`contextconfiguration.jsx` uses `import.meta.glob` to discover whatever files are present in this directory. Missing files don't break the build — the vibe selector falls back to its old gradient + label rendering for that tile.

See [`snapit-backend/assets/scenes/README.md`](../../../../snapit-backend/assets/scenes/README.md) for capture specs.
