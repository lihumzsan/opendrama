import { NextRequest, NextResponse } from 'next/server'

import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuthLight } from '@/lib/api-auth'

import {
  findProjectBatch,
  materializeCandidatePlan,
  readConfirmMode,
  returnIdempotentConfirm,
  selectCandidatePlan,
} from '../../_shared'
import type { CandidateEpisodeDraft, CandidateEpisodePlan } from '@/lib/novel-promotion/chapter-batch/types'

function applyEpisodeOverrides(plan: CandidateEpisodePlan, overrides: unknown): CandidateEpisodePlan {
  if (!Array.isArray(overrides) || overrides.length === 0) return plan
  let sourceCursor = 0
  return {
    ...plan,
    planId: `${plan.planId}:confirmed-preview`,
    title: `${plan.title}（确认稿）`,
    episodes: overrides.map((override, index) => {
      const baseEpisode = plan.episodes[index] || plan.episodes[plan.episodes.length - 1]
      if (!baseEpisode) {
        throw new ApiError('INVALID_PARAMS', { message: 'selected plan episodes are required' })
      }
      const item = override && typeof override === 'object' && !Array.isArray(override)
        ? override as Record<string, unknown>
        : {}
      const sourceText = typeof item.novelText === 'string'
        ? item.novelText.replace(/\r\n/g, '\n').trim()
        : typeof item.sourceText === 'string'
          ? item.sourceText.replace(/\r\n/g, '\n').trim()
          : baseEpisode.sourceText
      const sourceStart = sourceCursor
      const sourceEnd = sourceStart + sourceText.length
      sourceCursor = sourceEnd
      return {
        ...baseEpisode,
        provisionalNumber: index + 1,
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : baseEpisode.name,
        description: typeof item.description === 'string' && item.description.trim()
          ? item.description.trim()
          : baseEpisode.description,
        sourceStart,
        sourceEnd,
        sourceText,
      } satisfies CandidateEpisodeDraft
    }),
  }
}

export const POST = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; batchId: string }> },
) => {
  const { projectId, batchId } = await params
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const planId = typeof body.planId === 'string' && body.planId.trim() ? body.planId.trim() : ''
  if (!planId) throw new ApiError('INVALID_PARAMS', { message: 'planId is required' })

  const { project, batch } = await findProjectBatch(projectId, batchId)
  const idempotentResponse = await returnIdempotentConfirm(batch)
  if (idempotentResponse) return idempotentResponse
  if (batch.status === 'discarded') {
    throw new ApiError('INVALID_PARAMS', { message: 'discarded chapter batch cannot be confirmed' })
  }

  const plan = applyEpisodeOverrides(selectCandidatePlan(batch, planId), body.episodes)
  const mode = readConfirmMode(body.mode)
  const episodeId = typeof body.episodeId === 'string' && body.episodeId.trim() ? body.episodeId.trim() : null
  const episodes = await materializeCandidatePlan({
    project,
    batch,
    plan,
    mode,
    episodeId,
    confirmOverwrite: body.confirmOverwrite === true,
  })

  return NextResponse.json({ success: true, mode, episodes })
})
