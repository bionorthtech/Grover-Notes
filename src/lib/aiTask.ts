import type { Settings } from '../types'
import { resolveAiTarget, type AiTarget } from './aiTargets'
import { streamAiAgent, type AgentStreamCallbacks } from '../utils/streamAiAgent'
import { streamAiModel } from '../utils/streamAiModel'

/**
 * One-shot AI task runner. Grover's only AI entry points are *streaming* (CLI
 * agents via `stream_ai_agent`, API models via `stream_ai_model`). This wraps
 * either — chosen by the user's configured `AiTarget` — into a buffered
 * promise so features can do classify / extract / summarize style calls and get
 * the full text (or parsed JSON) back, regardless of whether the user runs a
 * local CLI agent or a hosted API model.
 */

export interface AiTaskRequest {
  /** Where to run: a CLI agent or an API model (use `resolveTaskTarget`). */
  target: AiTarget
  /** The user/task prompt. */
  message: string
  /** Optional system prompt. */
  systemPrompt?: string
  /** Vault root (required by the agent transport; ignored by API models). */
  vaultPath: string
  vaultPaths?: string[]
}

export class AiTaskError extends Error {
  /** Raw model output, when the failure was a parse/validation issue. */
  readonly raw?: string
  constructor(message: string, raw?: string) {
    super(message)
    this.name = 'AiTaskError'
    this.raw = raw
  }
}

/** Resolves the AI target the user configured in settings. */
export function resolveTaskTarget(settings: Settings): AiTarget {
  return resolveAiTarget(settings)
}

function bufferingCallbacks(resolve: (text: string) => void, reject: (err: Error) => void): AgentStreamCallbacks {
  let buffer = ''
  return {
    onText: (text) => { buffer += text },
    onThinking: () => {},
    onToolStart: () => {},
    onToolDone: () => {},
    onError: (message) => reject(new AiTaskError(message)),
    onDone: () => resolve(buffer),
  }
}

/** Runs a one-shot AI task and resolves with the full text response. */
export function runAiText(request: AiTaskRequest): Promise<string> {
  const { target, message, systemPrompt, vaultPath, vaultPaths } = request
  return new Promise<string>((resolve, reject) => {
    const callbacks = bufferingCallbacks(resolve, reject)
    const stream = target.kind === 'agent'
      ? streamAiAgent({ agent: target.agent, message, systemPrompt, vaultPath, vaultPaths, callbacks })
      : streamAiModel({ provider: target.provider, model: target.model, message, systemPrompt, callbacks })
    stream.catch((error: unknown) => reject(error instanceof Error ? error : new AiTaskError(String(error))))
  })
}

const JSON_INSTRUCTION = 'Respond with ONLY a single valid JSON value — no markdown fences, no commentary.'

function withJsonInstruction(systemPrompt?: string): string {
  return systemPrompt ? `${systemPrompt}\n\n${JSON_INSTRUCTION}` : JSON_INSTRUCTION
}

/**
 * Extracts a JSON value from a model response that may be wrapped in prose or a
 * ```json fence. Returns `undefined` if nothing parseable is found.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidates = [fenced?.[1]?.trim(), trimmed].filter((value): value is string => !!value)
  for (const candidate of candidates) {
    const direct = tryParse(candidate)
    if (direct !== undefined) return direct
    const sliced = tryParse(sliceFirstJson(candidate))
    if (sliced !== undefined) return sliced
  }
  return undefined
}

function tryParse(value: string | undefined): unknown {
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/** Narrows to the outermost {...} or [...] span so surrounding prose is dropped. */
function sliceFirstJson(text: string): string | undefined {
  const firstObj = text.indexOf('{')
  const firstArr = text.indexOf('[')
  const candidates = [firstObj, firstArr].filter((index) => index >= 0)
  if (candidates.length === 0) return undefined
  const start = Math.min(...candidates)
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  const end = text.lastIndexOf(close)
  return end > start ? text.slice(start, end + 1) : undefined
}

export interface RunStructuredOptions<T> {
  /** Optional type guard; when it fails, the call rejects with the raw text. */
  validate?: (value: unknown) => value is T
}

/**
 * Runs a one-shot AI task and parses the response as JSON. Appends a
 * JSON-only instruction to the system prompt and tolerates fenced/prose-wrapped
 * output. Rejects with `AiTaskError` (carrying the raw text) on parse/validation
 * failure.
 */
export async function runAiStructured<T = unknown>(
  request: AiTaskRequest,
  options: RunStructuredOptions<T> = {},
): Promise<T> {
  const text = await runAiText({ ...request, systemPrompt: withJsonInstruction(request.systemPrompt) })
  const parsed = extractJson(text)
  if (parsed === undefined) throw new AiTaskError('AI response did not contain valid JSON', text)
  if (options.validate && !options.validate(parsed)) throw new AiTaskError('AI response failed validation', text)
  return parsed as T
}
