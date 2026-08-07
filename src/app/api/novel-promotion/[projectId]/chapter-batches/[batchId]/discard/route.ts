import { NextRequest, NextResponse } from 'next/server'

import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuthLight } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

import { findProjectBatch, mapChapterBatch } from '../../_shared'

export const POST = apiHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; batchId: string }> },
) => {
  const { projectId, batchId } = await params
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const { batch } = await findProjectBatch(projectId, batchId)
  if (batch.status === 'confirmed') {
    throw new ApiError('INVALID_PARAMS', { message: 'confirmed chapter batch cannot be discarded' })
  }

  const updated = await prisma.novelPromotionChapterBatch.update({
    where: { id: batchId },
    data: { status: 'discarded' },
  })

  return NextResponse.json({ success: true, batch: mapChapterBatch(updated) })
})
