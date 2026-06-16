import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../utils/streamAiAgent', () => ({ streamAiAgent: vi.fn() }))
vi.mock('../utils/streamAiModel', () => ({ streamAiModel: vi.fn() }))

import { streamAiAgent } from '../utils/streamAiAgent'
import { streamAiModel } from '../utils/streamAiModel'
import { AiTaskError, extractJson, runAiStructured, runAiText, type AiTaskRequest } from './aiTask'
import type { AiTarget } from './aiTargets'

const agentTarget: AiTarget = { kind: 'agent', agent: 'claude_code', id: 'agent:claude_code', label: 'Claude Code', shortLabel: 'Claude' }
const modelTarget: AiTarget = {
  kind: 'api_model',
  provider: { id: 'p1', name: 'Anthropic', kind: 'anthropic', models: [] },
  model: { id: 'claude-x', display_name: 'Claude X' },
  id: 'model:p1/claude-x', label: 'Claude X', shortLabel: 'Claude X',
} as unknown as AiTarget

/** Drives the mocked stream by emitting text chunks then onDone (or onError). */
function emit(chunks: string[], opts: { error?: string } = {}) {
  return (req: { callbacks: { onText: (t: string) => void; onDone: () => void; onError: (m: string) => void } }) => {
    chunks.forEach((c) => req.callbacks.onText(c))
    if (opts.error) req.callbacks.onError(opts.error)
    else req.callbacks.onDone()
    return Promise.resolve()
  }
}

const baseReq: Omit<AiTaskRequest, 'target'> = { message: 'hi', vaultPath: '/v' }

describe('runAiText', () => {
  beforeEach(() => vi.clearAllMocks())

  it('buffers streamed chunks from a CLI agent into one string', async () => {
    vi.mocked(streamAiAgent).mockImplementation(emit(['Hello, ', 'world']) as never)
    await expect(runAiText({ ...baseReq, target: agentTarget })).resolves.toBe('Hello, world')
    expect(streamAiModel).not.toHaveBeenCalled()
  })

  it('routes api_model targets to streamAiModel', async () => {
    vi.mocked(streamAiModel).mockImplementation(emit(['from ', 'api']) as never)
    await expect(runAiText({ ...baseReq, target: modelTarget })).resolves.toBe('from api')
    expect(streamAiAgent).not.toHaveBeenCalled()
  })

  it('rejects with AiTaskError when the stream errors', async () => {
    vi.mocked(streamAiAgent).mockImplementation(emit([], { error: 'boom' }) as never)
    await expect(runAiText({ ...baseReq, target: agentTarget })).rejects.toThrow(/boom/)
  })
})

describe('extractJson', () => {
  it('parses bare JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
    expect(extractJson('[1,2,3]')).toEqual([1, 2, 3])
  })

  it('parses JSON inside a ```json fence', () => {
    expect(extractJson('```json\n{"type":"Project"}\n```')).toEqual({ type: 'Project' })
  })

  it('parses JSON embedded in prose', () => {
    expect(extractJson('Sure! Here you go: {"ok": true} — hope that helps')).toEqual({ ok: true })
  })

  it('returns undefined when there is no JSON', () => {
    expect(extractJson('no json here')).toBeUndefined()
  })
})

describe('runAiStructured', () => {
  beforeEach(() => vi.clearAllMocks())

  it('parses a structured JSON response', async () => {
    vi.mocked(streamAiModel).mockImplementation(emit(['{"type":"Person","confidence":0.9}']) as never)
    const result = await runAiStructured<{ type: string; confidence: number }>({ ...baseReq, target: modelTarget })
    expect(result).toEqual({ type: 'Person', confidence: 0.9 })
  })

  it('throws AiTaskError with raw text when no JSON is present', async () => {
    vi.mocked(streamAiAgent).mockImplementation(emit(['I cannot help with that']) as never)
    await expect(runAiStructured({ ...baseReq, target: agentTarget })).rejects.toBeInstanceOf(AiTaskError)
  })

  it('rejects when the validator fails', async () => {
    vi.mocked(streamAiAgent).mockImplementation(emit(['{"wrong":1}']) as never)
    const validate = (v: unknown): v is { type: string } => typeof (v as { type?: unknown }).type === 'string'
    await expect(runAiStructured({ ...baseReq, target: agentTarget }, { validate })).rejects.toThrow(/validation/)
  })
})
