/** Pure 1:1 crop geometry for the avatar cropper. Offsets are in viewport px, image centre relative to viewport centre. */
export const AVATAR_OUTPUT_PX = 256;

export function cropScale(w: number, h: number, viewport: number, zoom: number) {
  return (viewport / Math.min(w, h)) * zoom;
}

/** Clamp offset so the scaled image always covers the square viewport. */
export function clampOffset(w: number, h: number, viewport: number, zoom: number, x: number, y: number) {
  const s = cropScale(w, h, viewport, zoom);
  const mx = Math.max(0, (w * s - viewport) / 2);
  const my = Math.max(0, (h * s - viewport) / 2);
  return { x: Math.min(mx, Math.max(-mx, x)), y: Math.min(my, Math.max(-my, y)) };
}

/** Source rectangle in natural image pixels that the viewport shows. */
export function cropRect(w: number, h: number, viewport: number, zoom: number, x: number, y: number) {
  const s = cropScale(w, h, viewport, zoom);
  const c = clampOffset(w, h, viewport, zoom, x, y);
  const size = viewport / s;
  return { sx: w / 2 - c.x / s - size / 2, sy: h / 2 - c.y / s - size / 2, size };
}
