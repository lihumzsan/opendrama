import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { VideoPanelGroup } from '@/lib/novel-promotion/stages/video-stage-runtime/video-panel-groups'
import VideoSegmentGroup from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/video-stage/VideoSegmentGroup'

vi.stubGlobal('React', React)

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const labels: Record<string, string> = {
      'segments.title': `片段 ${String(values?.index)}`,
      'segments.shots': `${String(values?.count)} 个镜头`,
      'segments.completed': `已完成 ${String(values?.count)}`,
      'segments.running': `生成中 ${String(values?.count)}`,
      'segments.failed': `失败 ${String(values?.count)}`,
      'segments.pending': `待生成 ${String(values?.count)}`,
      'segments.generatePending': '生成未完成',
      'segments.retryFailed': '重试失败',
      'segments.expand': '展开',
      'segments.collapse': '收起',
    }
    return labels[key] || key
  },
}))

vi.mock('@/components/ui/icons', () => ({
  AppIcon: () => React.createElement('span'),
}))

const group: VideoPanelGroup = {
  storyboardId: 'storyboard-1',
  clipId: 'clip-1',
  index: 0,
  summary: '初入山门',
  panels: [],
  stats: { total: 3, completed: 1, running: 0, failed: 1, pending: 1 },
}

describe('video segment group', () => {
  it('shows segment progress and exposes only actionable group actions', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        VideoSegmentGroup,
        {
          group,
          expanded: true,
          isSubmitting: false,
          onToggle: vi.fn(),
          onGeneratePending: vi.fn(),
          onRetryFailed: vi.fn(),
        },
        React.createElement('div', null, '镜头卡片'),
      ),
    )

    expect(markup).toContain('片段 1')
    expect(markup).toContain('初入山门')
    expect(markup).toContain('3 个镜头')
    expect(markup).toContain('已完成 1')
    expect(markup).toContain('失败 1')
    expect(markup).toContain('生成未完成')
    expect(markup).toContain('重试失败')
    expect(markup).toContain('镜头卡片')
  })
})
