'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import type { VideoPanelGroup } from '@/lib/novel-promotion/stages/video-stage-runtime/video-panel-groups'

interface VideoSegmentGroupProps {
  group: VideoPanelGroup
  expanded: boolean
  isSubmitting: boolean
  onToggle: () => void
  onGeneratePending: () => void
  onRetryFailed: () => void
  children?: ReactNode
}

export default function VideoSegmentGroup({
  group,
  expanded,
  isSubmitting,
  onToggle,
  onGeneratePending,
  onRetryFailed,
  children,
}: VideoSegmentGroupProps) {
  const t = useTranslations('video')
  const { stats } = group
  const hasPending = stats.pending > 0
  const hasFailed = stats.failed > 0

  return (
    <section className="glass-surface-elevated overflow-hidden">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <span className="glass-surface-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-[var(--glass-tone-info-fg)]">
            {group.index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-semibold text-[var(--glass-text-primary)]">
                {t('segments.title', { index: group.index + 1 })}
              </span>
              <span className="text-xs text-[var(--glass-text-tertiary)]">
                {t('segments.shots', { count: stats.total })}
              </span>
            </span>
            {group.summary ? (
              <span className="mt-1 block line-clamp-1 text-sm text-[var(--glass-text-tertiary)]">
                {group.summary}
              </span>
            ) : null}
            <span className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="text-[var(--glass-tone-success-fg)]">{t('segments.completed', { count: stats.completed })}</span>
              <span className="text-[var(--glass-tone-info-fg)]">{t('segments.running', { count: stats.running })}</span>
              <span className="text-[var(--glass-tone-danger-fg)]">{t('segments.failed', { count: stats.failed })}</span>
              <span className="text-[var(--glass-text-tertiary)]">{t('segments.pending', { count: stats.pending })}</span>
            </span>
          </span>
          <AppIcon
            name="chevronDown"
            className={`h-5 w-5 shrink-0 text-[var(--glass-text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
          <span className="sr-only">{expanded ? t('segments.collapse') : t('segments.expand')}</span>
        </button>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <button
            type="button"
            onClick={onGeneratePending}
            disabled={!hasPending || isSubmitting}
            className="glass-btn-base glass-btn-secondary px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('segments.generatePending')}
          </button>
          <button
            type="button"
            onClick={onRetryFailed}
            disabled={!hasFailed || isSubmitting}
            className="glass-btn-base glass-btn-secondary px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('segments.retryFailed')}
          </button>
        </div>
      </div>

      {expanded ? <div className="border-t border-[var(--glass-stroke-base)] p-4">{children}</div> : null}
    </section>
  )
}
