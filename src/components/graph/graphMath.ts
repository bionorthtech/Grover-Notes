/** Pure colour/scale helpers for the graph canvas (kept out of the component
 *  file so React fast-refresh keeps working). */

/** Parses a #hex or rgb()/rgba() string to [r,g,b], or null if unrecognised. */
function parseRgb(color: string): [number, number, number] | null {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1]
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
  }
  const rgb = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return null
}

/** Scales a colour toward black by `amount` (0 = unchanged, 1 = black). */
export function darken(color: string, amount: number): string {
  const rgb = parseRgb(color)
  if (!rgb) return color
  const k = Math.max(0, Math.min(1, 1 - amount))
  const [r, g, b] = rgb.map((c) => Math.round(c * k))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * True when a colour is effectively greyscale (very low saturation) — used to
 * detect the "no type colour" default so those nodes can fall back to green
 * instead of rendering grey. `tolerance` is the max channel spread treated as grey.
 */
export function isGreyish(color: string, tolerance = 26): boolean {
  const rgb = parseRgb(color)
  if (!rgb) return false
  return Math.max(...rgb) - Math.min(...rgb) <= tolerance
}

/** Smoothly maps the camera scale to label opacity given the fade threshold. */
export function labelAlpha(scale: number, textFade: number): number {
  const cutoff = 0.25 + textFade * 0.85
  const t = (scale - cutoff) / 0.25
  return Math.max(0, Math.min(1, t))
}
