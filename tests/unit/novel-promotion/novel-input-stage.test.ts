import * as React from 'react'
import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import NovelInputStage from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/NovelInputStage'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (values && 'name' in values) {
      return `${key}:${String(values.name)}`
    }
    return key
  },
}))

vi.mock('@/components/story-input/StoryInputComposer', () => ({
  default: ({
    minRows,
    maxHeightViewportRatio,
    textareaClassName,
    topRight,
    footer,
    secondaryActions,
    primaryAction,
  }: {
    minRows: number
    maxHeightViewportRatio: number
    textareaClassName?: string
    topRight?: React.ReactNode
    footer?: React.ReactNode
    secondaryActions?: React.ReactNode
    primaryAction: React.ReactNode
  }) => createElement(
    'section',
    {
      'data-min-rows': String(minRows),
      'data-max-height-ratio': String(maxHeightViewportRatio),
      'data-textarea-class': textareaClassName,
    },
    topRight,
    footer,
    secondaryActions,
    primaryAction,
    'StoryInputComposer',
  ),
}))

vi.mock('@/components/task/TaskStatusInline', () => ({
  default: () => createElement('span', null, 'TaskStatusInline'),
}))

vi.mock('@/components/home/AiWriteModal', () => ({
  default: () => createElement('div', null, 'AiWriteModal'),
}))

vi.mock('@/lib/api-fetch', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@/lib/home/ai-story-expand', () => ({
  expandHomeStory: vi.fn(),
}))

vi.mock('@/components/ui/icons', () => ({
  AppIcon: ({ name, ...props }: { name: string } & Record<string, unknown>) =>
    createElement('span', { ...props, 'data-icon': name }),
}))

describe('NovelInputStage', () => {
  it('uses the shared composer with a taller adaptive baseline in story mode', () => {
    Reflect.set(globalThis, 'React', React)

    const html = renderToStaticMarkup(
      createElement(NovelInputStage, {
        novelText: '',
        episodeName: '剧集 1',
        onNovelTextChange: () => undefined,
        onNext: () => undefined,
      }),
    )

    expect(html).toContain('StoryInputComposer')
    expect(html).toContain('data-min-rows="8"')
    expect(html).toContain('data-max-height-ratio="0.5"')
    expect(html).toContain('data-textarea-class="px-0 pt-0 pb-3 align-top"')
    expect(html).toContain('aiWrite.trigger')
    expect(html).toContain('AiWriteModal')
    expect(html).not.toContain('storyInput.wordCount 0')
    expect(html).not.toContain('storyInput.currentConfigSummary')
  })

  it('starts chapter-batch import for plain document text from the primary action', async () => {
    Reflect.set(globalThis, 'React', React)
    const onSmartSplit = vi.fn()
    const onNext = vi.fn()
    let renderer: ReactTestRenderer

    await act(async () => {
      renderer = create(createElement(NovelInputStage, {
        novelText: '1111\n2222\n3333',
        onNovelTextChange: () => undefined,
        onNext,
        onSmartSplit,
      }))
    })

    const primaryAction = renderer!.root.findAllByType('button').find((button) =>
      String(button.props.className).includes('glass-btn-primary'),
    )

    expect(primaryAction).toBeDefined()
    await act(async () => {
      primaryAction!.props.onClick()
    })

    expect(onSmartSplit).toHaveBeenCalledWith('1111\n2222\n3333')
    expect(onNext).not.toHaveBeenCalled()
  })
})
