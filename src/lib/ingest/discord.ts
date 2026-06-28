import type { SourceNote } from './source'

/**
 * Discord export → Source note. Discord has no anonymous read API, so we import
 * a DiscordChatExporter JSON file (the practical, fully-offline path): a single
 * object with `channel`, `guild`, and `messages[]` (each with `author`,
 * `content`, `timestamp`, `attachments[]`). Pure + synchronous.
 */

interface DiscordAuthor { name?: string; nickname?: string }
interface DiscordAttachment { url?: string; fileName?: string }
interface DiscordMessage {
  author?: DiscordAuthor
  content?: string
  timestamp?: string
  attachments?: DiscordAttachment[]
}
interface DiscordExport {
  guild?: { name?: string }
  channel?: { name?: string; id?: string }
  messages?: DiscordMessage[]
}

function authorName(author: DiscordAuthor | undefined): string {
  return author?.nickname || author?.name || 'unknown'
}

function formatTime(timestamp: string | undefined): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16).replace('T', ' ')
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i

/** Render an image attachment inline (so it shows offline) and others as links. */
function renderAttachment(name: string, url: string): string {
  return IMAGE_RE.test(name) || IMAGE_RE.test(url) ? `> ![${name}](${url})` : `> [${name}](${url})`
}

/** Transforms a DiscordChatExporter JSON payload into a Source note. */
export function discordExportToSourceNote(payload: unknown): SourceNote {
  const data = (payload ?? {}) as DiscordExport
  const channel = data.channel?.name || 'channel'
  const guild = data.guild?.name
  const title = guild ? `${guild} #${channel}` : `#${channel}`

  const assets: string[] = []
  const body: string[] = []
  for (const message of data.messages ?? []) {
    const time = formatTime(message.timestamp)
    body.push(`**${authorName(message.author)}**${time ? ` · ${time}` : ''}`)
    const content = (message.content ?? '').trim()
    if (content) for (const line of content.split('\n')) body.push(`> ${line}`)
    for (const attachment of message.attachments ?? []) {
      const url = attachment.url ?? ''
      if (url) {
        body.push(renderAttachment(attachment.fileName || 'attachment', url))
        if (!assets.includes(url)) assets.push(url)
      }
    }
    body.push('')
  }

  return { title, source: 'discord', url: data.channel?.id ? `discord://channel/${data.channel.id}` : '', author: null, body: body.join('\n'), assets }
}
