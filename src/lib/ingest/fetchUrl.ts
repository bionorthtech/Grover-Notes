import { invoke } from '@tauri-apps/api/core'
import { detectAndTransform, type DetectResult } from './index'

/**
 * Normalize a pasted URL into the endpoint that returns machine-readable data.
 * Reddit and Discourse both expose a `.json` view of a thread at the same path,
 * which is what our transforms parse. Other URLs are fetched as-is (web clip).
 */
export function normalizeFetchUrl(rawUrl: string): string {
  const url = rawUrl.trim()
  if (!url) return url
  const withoutQuery = url.split(/[?#]/)[0]
  if (/^https?:\/\/([a-z0-9-]+\.)*reddit\.com\/r\/[^/]+\/comments\//i.test(withoutQuery)) {
    return appendJson(withoutQuery)
  }
  if (/\/t\/[^/]+\/\d+(?:\/\d+)?$/.test(withoutQuery)) {
    return appendJson(withoutQuery)
  }
  return url
}

function appendJson(url: string): string {
  const trimmed = url.replace(/\/+$/, '')
  return trimmed.endsWith('.json') ? trimmed : `${trimmed}.json`
}

/**
 * Download a note's assets into `<vault>/<destDir>` via the Rust command,
 * returning the saved filenames aligned (by index) with `urls`. Returns an
 * empty list if there are no assets or the native command is unavailable.
 */
export async function downloadAssets(vaultPath: string, destDir: string, urls: string[]): Promise<string[]> {
  if (urls.length === 0) return []
  try {
    return await invoke<string[]>('ingest_download_assets', { vaultPath, destDir, urls })
  } catch {
    return []
  }
}

/** Fetch a URL via the Rust ingest command and transform its body into a note. */
export async function fetchAndDetect(rawUrl: string): Promise<DetectResult> {
  const target = normalizeFetchUrl(rawUrl)
  if (!/^https?:\/\//i.test(target)) {
    return { ok: false, error: 'Enter an http(s) URL to fetch.' }
  }
  try {
    const body = await invoke<string>('ingest_fetch', { url: target })
    return detectAndTransform(body)
  } catch (error) {
    return { ok: false, error: `Could not fetch the URL: ${String(error)}` }
  }
}
