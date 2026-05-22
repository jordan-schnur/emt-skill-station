# T-030 — VideoCard Design

**Ticket:** #66 (T-030 Build VideoCard component with real YouTube thumbnails)
**Depends on:** T-029 (Video type + videos[] on Sheet) — already landed on phase1-schema-foundations

---

## Component: `src/components/VideoCard.tsx`

Props: `{ video: Video }`

Renders an `<a href={video.url} target="_blank" rel="noopener noreferrer">`:
- Thumbnail area (320×180): `<img src={https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg} alt={video.title} onError={showFallback}>`
- Fallback: when image errors, replace with a CSS-striped div (diagonal stripes, same dimensions)
- Body: title (bold), channel name, duration (if present), small "↗ opens YouTube" label

No JavaScript `window.open` — the anchor tag handles navigation.

---

## Placement in SheetView

A `<VideosSection sheet={sheet} />` component rendered inside `SheetView` between `<QuickJump>` and `<div class="tab-content">`, only when `sheet.videos && sheet.videos.length > 0`.

`VideosSection` is a local component in `SheetView.tsx` (not a separate file — small enough).

Header: "Watch how it's done" (`<h3>`) with a subdued `<span class="meta">External videos · opens YouTube</span>`.

---

## Layout

```
.videos-section           — wrapper, margin-top spacing
  .videos-section-head    — flex row: h3 + meta span
  .videos-grid            — CSS grid, auto-fill minmax(280px, 1fr), gap
    .video-card           — <a>, display block, border, border-radius, overflow hidden
      .video-card-thumb   — 16:9 aspect-ratio container
        img               — width 100%, height auto
        .video-card-thumb-fallback  — hidden by default, shown on error
      .video-card-body    — padding
        .video-card-title — font-weight bold, line-clamp 2
        .video-card-meta  — channel · duration · "↗ opens YouTube"
```

On screens < 600px: grid becomes single column (or horizontal scroll via `overflow-x: auto; grid-auto-flow: column; grid-template-columns: repeat(N, 260px)`).

---

## Files

| Action | Path |
|--------|------|
| Create | `src/components/VideoCard.tsx` |
| Modify | `src/views/SheetView.tsx` — add VideosSection |
| Modify | `css/styles.css` — video card styles |

---

## Tests

- `VideoCard` renders with correct `href`, `target="_blank"`, `rel="noopener noreferrer"`
- Thumbnail `src` matches `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
- `onError` on the img element triggers fallback div visibility
- `SheetView` with a sheet that has `videos`: `VideosSection` is present in render output
- `SheetView` with a sheet that has no `videos`: `VideosSection` is absent
