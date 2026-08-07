import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  analyzeChapterBatchMock,
  confirmChapterBatchMock,
  createChapterBatchMock,
  listProjectEpisodesMock,
  saveProjectEpisodesBatchMock,
  splitProjectEpisodesByMarkersMock,
} = vi.hoisted(() => ({
  analyzeChapterBatchMock: vi.fn(),
  confirmChapterBatchMock: vi.fn(),
  createChapterBatchMock: vi.fn(),
  listProjectEpisodesMock: vi.fn(),
  saveProjectEpisodesBatchMock: vi.fn(),
  splitProjectEpisodesByMarkersMock: vi.fn(),
}))

vi.mock('@/lib/query/hooks', () => ({
  useAnalyzeChapterBatch: () => ({ mutateAsync: analyzeChapterBatchMock }),
  useConfirmChapterBatch: () => ({ mutateAsync: confirmChapterBatchMock }),
  useCreateChapterBatch: () => ({ mutateAsync: createChapterBatchMock }),
  useListProjectEpisodes: () => ({ mutateAsync: listProjectEpisodesMock }),
  useSaveProjectEpisodesBatch: () => ({ mutateAsync: saveProjectEpisodesBatchMock }),
  useSplitProjectEpisodesByMarkers: () => ({ mutateAsync: splitProjectEpisodesByMarkersMock }),
}))

import { useWizardState } from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/smart-import/hooks/useWizardState'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const renderers: ReactTestRenderer[] = []
let latestWizard: ReturnType<typeof useWizardState> | null = null

function WizardHarness({ initialRawContent }: { initialRawContent: string }) {
  latestWizard = useWizardState({
    projectId: 'project-1',
    initialRawContent,
    onImportComplete: () => undefined,
    t: (key) => key,
  })
  return null
}

async function flushAsyncUpdates() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

afterEach(async () => {
  await act(async () => {
    for (const renderer of renderers.splice(0)) renderer.unmount()
  })
  analyzeChapterBatchMock.mockReset()
  confirmChapterBatchMock.mockReset()
  createChapterBatchMock.mockReset()
  listProjectEpisodesMock.mockReset()
  saveProjectEpisodesBatchMock.mockReset()
  splitProjectEpisodesByMarkersMock.mockReset()
  latestWizard = null
})

describe('chapter batch entry', () => {
  it('routes a headed document through chapter batch AI analysis instead of marker splitting', async () => {
    const sourceText = `第1集：天网压星\n${'剧情'.repeat(60)}\n第2集：飞星入网\n${'冲突'.repeat(60)}\n第3集：星宿断线\n${'转折'.repeat(60)}`
    createChapterBatchMock.mockResolvedValue({
      batch: { id: 'batch-1' },
    })
    analyzeChapterBatchMock.mockResolvedValue({
      candidatePlans: [{
        planId: 'plan-1',
        title: 'AI 方案',
        rationale: '按剧情转折拆分',
        episodes: [{
          provisionalNumber: 1,
          name: '第 1 集',
          description: '简介',
          sourceStart: 0,
          sourceEnd: sourceText.length,
          sourceText,
          coreGoal: '目标',
          dramaticArc: '起承转合',
          endingHook: '钩子',
          adaptationNotes: { keep: [], merge: [], remove: [], externalize: [], inferred: [] },
        }],
      }],
    })

    let renderer: ReactTestRenderer
    await act(async () => {
      renderer = create(createElement(WizardHarness, { initialRawContent: sourceText }))
      await flushAsyncUpdates()
    })
    renderers.push(renderer!)

    expect(createChapterBatchMock).toHaveBeenCalledWith({
      title: '第1集：天网压星',
      sourceText,
    })
    expect(analyzeChapterBatchMock).toHaveBeenCalledWith({ batchId: 'batch-1' })
    expect(splitProjectEpisodesByMarkersMock).not.toHaveBeenCalled()
  })

  it('asks before replacing a duplicate batch, then reruns AI analysis after confirmation', async () => {
    const sourceText = `${'剧情'.repeat(120)}`
    const duplicateError = Object.assign(new Error('chapter batch with the same source text already exists'), {
      payload: {
        error: {
          code: 'CONFLICT',
          details: { reason: 'duplicate_chapter_batch' },
        },
      },
    })
    createChapterBatchMock
      .mockRejectedValueOnce(duplicateError)
      .mockResolvedValueOnce({ batch: { id: 'batch-recreated' } })
    analyzeChapterBatchMock.mockResolvedValue({
      candidatePlans: [{
        planId: 'plan-recreated',
        title: 'AI 方案',
        rationale: '按剧情转折拆分',
        episodes: [{
          provisionalNumber: 1,
          name: '第 1 集',
          description: '简介',
          sourceStart: 0,
          sourceEnd: sourceText.length,
          sourceText,
          coreGoal: '目标',
          dramaticArc: '起承转合',
          endingHook: '钩子',
          adaptationNotes: { keep: [], merge: [], remove: [], externalize: [], inferred: [] },
        }],
      }],
    })

    let renderer: ReactTestRenderer
    await act(async () => {
      renderer = create(createElement(WizardHarness, { initialRawContent: sourceText }))
      await flushAsyncUpdates()
    })
    renderers.push(renderer!)

    expect(latestWizard?.replaceExistingConfirm.show).toBe(true)

    await act(async () => {
      await latestWizard?.confirmReplaceExisting()
      await flushAsyncUpdates()
    })

    expect(createChapterBatchMock).toHaveBeenLastCalledWith({
      title: sourceText.slice(0, 80),
      sourceText,
      replaceExisting: true,
    })
    expect(analyzeChapterBatchMock).toHaveBeenCalledWith({ batchId: 'batch-recreated' })
    expect(latestWizard?.stage).toBe('preview')
  })
})
