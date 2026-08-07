import { NextRequest } from 'next/server'

import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuthLight } from '@/lib/api-auth'
import { maybeSubmitLLMTask } from '@/lib/llm-observe/route-task'
import { TASK_TYPE } from '@/lib/task/types'

import { findProjectBatch } from '../../_shared'

export const POST = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; batchId: string }> },
) => {
  const { projectId, batchId } = await params
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const { batch } = await findProjectBatch(projectId, batchId)
  if (batch.status === 'confirmed' || batch.status === 'discarded') {
    throw new ApiError('INVALID_PARAMS', {
      message: `cannot analyze ${batch.status} chapter batch`,
      status: batch.status,
    })
  }

  const asyncTaskResponse = await maybeSubmitLLMTask({
    request,
    userId: session.user.id,
    projectId,
    type: TASK_TYPE.CHAPTER_BATCH_ANALYZE,
    targetType: 'NovelPromotionChapterBatch',
    targetId: batchId,
    routePath: `/api/novel-promotion/${projectId}/chapter-batches/${batchId}/analyze`,
    body: { batchId },
    dedupeKey: `chapter_batch_analyze:${batchId}:${batch.sourceFingerprint}`,
    maxAttempts: 1,
  })
  if (asyncTaskResponse) return asyncTaskResponse

  throw new ApiError('INVALID_PARAMS')
})
