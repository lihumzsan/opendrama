import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  useMutationMock,
  requestTaskResponseWithErrorMock,
  resolveTaskResponseMock,
} = vi.hoisted(() => ({
  useMutationMock: vi.fn((options: unknown) => options),
  requestTaskResponseWithErrorMock: vi.fn(),
  resolveTaskResponseMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => useMutationMock(options),
  useQueryClient: vi.fn(),
}))

vi.mock('@/lib/task/client', () => ({
  resolveTaskResponse: resolveTaskResponseMock,
}))

vi.mock('@/lib/query/mutations/mutation-shared', () => ({
  invalidateQueryTemplates: vi.fn(),
  requestBlobWithError: vi.fn(),
  requestJsonWithError: vi.fn(),
  requestTaskResponseWithError: requestTaskResponseWithErrorMock,
}))

import { useSplitProjectEpisodes } from '@/lib/query/mutations/useEpisodeMutations'

interface SplitEpisodesMutation {
  mutationFn: (payload: { content: string; async?: boolean }) => Promise<unknown>
}

describe('useSplitProjectEpisodes', () => {
  beforeEach(() => {
    useMutationMock.mockClear()
    requestTaskResponseWithErrorMock.mockReset()
    resolveTaskResponseMock.mockReset()
  })

  it('waits for the AI split task with a finite timeout', async () => {
    const response = {} as Response
    const resolved = {
      episodes: [{
        number: 1,
        title: 'Episode 1',
        summary: 'Summary',
        content: 'Content',
        wordCount: 7,
      }],
    }
    requestTaskResponseWithErrorMock.mockResolvedValue(response)
    resolveTaskResponseMock.mockResolvedValue(resolved)

    const mutation = useSplitProjectEpisodes('project-1') as unknown as SplitEpisodesMutation
    const result = await mutation.mutationFn({ content: 'long novel', async: true })

    expect(resolveTaskResponseMock).toHaveBeenCalledWith(response, {
      timeoutMs: 21 * 60 * 1000,
    })
    expect(result).toBe(resolved)
  })
})
