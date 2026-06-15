import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'

/** Reads a note's markdown from disk (or the mock store in browser dev). */
export function readNoteContent(path: string, vaultPath?: string): Promise<string> {
  const args = vaultPath ? { path, vaultPath } : { path }
  return isTauri() ? invoke<string>('get_note_content', args) : mockInvoke<string>('get_note_content', args)
}

/** Overwrites an existing note's markdown on disk (or the mock store). */
export function saveNoteContent(path: string, content: string, vaultPath?: string): Promise<void> {
  const args = vaultPath ? { path, content, vaultPath } : { path, content }
  const result = isTauri() ? invoke<void>('save_note_content', args) : mockInvoke<void>('save_note_content', args)
  return result.then(() => {})
}
