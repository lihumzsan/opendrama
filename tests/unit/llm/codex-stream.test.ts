import { beforeEach, describe, expect, it, vi } from 'vitest'

const runCodexTextCompletionMock = vi.hoisted(() => vi.fn())
const resolveCodexExecutablePathMock = vi.hoisted(() => vi.fn())
const getProviderConfigMock = vi.hoisted(() => vi.fn())
const resolveLlmRuntimeModelMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/providers/codex/client', () => ({
  resolveCodexExecutablePath: resolveCodexExecutablePathMock,
  runCodexTextCompletion: runCodexTextCompletionMock,
}))

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: getProviderConfigMock,
  getProviderKey: (providerId?: string) => {
    if (!providerId) return ''
    const colonIndex = providerId.indexOf(':')
    return colonIndex === -1 ? providerId : providerId.slice(0, colonIndex)
  },
}))

vi.mock('@/lib/llm/runtime-shared', () => ({
  completionUsageSummary: () => ({ promptTokens: 0, completionTokens: 0 }),
  llmLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logLlmRawInput: vi.fn(),
  logLlmRawOutput: vi.fn(),
  recordCompletionUsage: vi.fn(),
  resolveLlmRuntimeModel: resolveLlmRuntimeModelMock,
}))

import { chatCompletion } from '@/lib/llm/chat-completion'
import { chatCompletionStream } from '@/lib/llm/chat-stream'

describe('codex llm stream branch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveLlmRuntimeModelMock.mockResolvedValue({
      provider: 'codex',
      modelId: 'gpt-5.5',
      modelKey: 'codex::gpt-5.5',
    })
    getProviderConfigMock.mockResolvedValue({
      id: 'codex',
      name: 'Codex (Local)',
      apiKey: '',
      executablePath: '/custom/codex',
    })
    resolveCodexExecutablePathMock.mockReturnValue('/resolved/codex')
    runCodexTextCompletionMock.mockResolvedValue({
      text: 'final codex text',
      stdout: '',
      stderr: '',
    })
  })

  it('emits stage events and one final text chunk', async () => {
    const lifecycle: string[] = []
    const stages: string[] = []
    const chunks: string[] = []
    const completed: string[] = []
    resolveCodexExecutablePathMock.mockImplementationOnce(() => {
      lifecycle.push('resolve')
      return '/resolved/codex'
    })

    const completion = await chatCompletionStream(
      'user-1',
      'codex::gpt-5.5',
      [{ role: 'user', content: 'hello' }],
      {},
      {
        onStage: (stage) => {
          stages.push(stage.stage)
          lifecycle.push(`stage:${stage.stage}`)
        },
        onChunk: (chunk) => chunks.push(chunk.delta),
        onComplete: (text) => completed.push(text),
      },
    )

    expect(runCodexTextCompletionMock).toHaveBeenCalledWith({
      codexPath: '/resolved/codex',
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hello' }],
      cwd: process.cwd(),
    })
    expect(resolveCodexExecutablePathMock).toHaveBeenCalledWith('/custom/codex')
    expect(resolveCodexExecutablePathMock.mock.invocationCallOrder[0]).toBeLessThan(
      runCodexTextCompletionMock.mock.invocationCallOrder[0]!,
    )
    expect(lifecycle).toEqual([
      'stage:submit',
      'resolve',
      'stage:streaming',
      'stage:completed',
    ])
    expect(stages).toEqual(['submit', 'streaming', 'completed'])
    expect(chunks).toEqual(['final codex text'])
    expect(completed).toEqual(['final codex text'])
    expect(completion.choices[0]?.message?.content).toBe('final codex text')
  })

  it('wraps non-stream codex output as a chat completion', async () => {
    const completion = await chatCompletion(
      'user-1',
      'codex::gpt-5.5',
      [{ role: 'user', content: 'hello' }],
      {},
    )

    expect(runCodexTextCompletionMock).toHaveBeenCalledWith({
      codexPath: '/custom/codex',
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'hello' }],
      cwd: process.cwd(),
    })
    expect(completion.choices[0]?.message?.content).toBe('final codex text')
  })
})
