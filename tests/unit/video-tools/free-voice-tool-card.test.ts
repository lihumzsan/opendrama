import * as React from 'react'
import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FreeVoiceToolCard from '@/app/[locale]/workspace/video-tools/FreeVoiceToolCard'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

vi.stubGlobal('React', React)
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { apiFetchMock, translateMock, useProjectCharactersMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  translateMock: (key: string) => key,
  useProjectCharactersMock: vi.fn(),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => translateMock,
}))

vi.mock('@/lib/api-fetch', () => ({
  apiFetch: apiFetchMock,
}))

vi.mock('@/lib/query/hooks', () => ({
  useProjectCharacters: useProjectCharactersMock,
}))

vi.mock('@/components/ui/icons', () => ({
  AppIcon: ({ name, className }: { name: string; className?: string }) => (
    createElement('span', { 'data-icon': name, className })
  ),
}))

const renderers: ReactTestRenderer[] = []

function response(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response
}

async function flushAsyncUpdates() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

afterEach(async () => {
  await act(async () => {
    for (const renderer of renderers.splice(0)) renderer.unmount()
  })
  apiFetchMock.mockReset()
  useProjectCharactersMock.mockReset()
})

describe('FreeVoiceToolCard', () => {
  it('keeps the draft text after a successful free-voice submission', async () => {
    useProjectCharactersMock.mockReturnValue({
      data: [{ id: 'character-1', name: 'Narrator', customVoiceUrl: '/voice/narrator.wav' }],
      isLoading: false,
      isError: false,
    })
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith('/api/projects')) return response({ projects: [{ id: 'project-1', name: 'Project One' }] })
      if (init?.method === 'POST') {
        return response({
          record: {
            id: 'record-1',
            taskId: 'task-1',
            text: 'Keep this narration',
            voiceName: 'Narrator',
            projectName: 'Project One',
            characterName: 'Narrator',
            status: 'completed',
            progress: 100,
            createdAt: '2026-07-25T00:00:00.000Z',
            updatedAt: '2026-07-25T00:00:00.000Z',
          },
        })
      }
      return response({ records: [] })
    })

    let renderer: ReactTestRenderer
    await act(async () => {
      renderer = create(createElement(FreeVoiceToolCard))
      await flushAsyncUpdates()
    })
    renderers.push(renderer!)

    const [projectSelect, characterSelect] = renderer!.root.findAllByType('select')
    await act(async () => {
      projectSelect.props.onChange({ target: { value: 'project-1' } })
      characterSelect.props.onChange({ target: { value: 'character-1' } })
      renderer!.root.findByType('textarea').props.onChange({ target: { value: 'Keep this narration' } })
    })

    await act(async () => {
      renderer!.root.findByType('button').props.onClick()
      await flushAsyncUpdates()
    })

    expect(renderer!.root.findByType('textarea').props.value).toBe('Keep this narration')
  })
})
