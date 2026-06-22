/**
 * Rewrites archived asset URLs in a Source note body to point at the local
 * copies downloaded into the vault, so the note re-reads offline. `savedNames`
 * is aligned with `assets` by index; assets that failed to download (no saved
 * name at that index) keep their original remote URL.
 */
export function rewriteAssetUrls(
  body: string,
  assets: string[],
  savedNames: string[],
  assetDir: string,
): string {
  const dir = assetDir.replace(/\/+$/, '')
  return assets.reduce((current, url, index) => {
    const name = savedNames[index]
    if (!name) return current
    const localPath = `${dir}/${name}`
    return current.split(url).join(localPath)
  }, body)
}
