import { NextRequest, NextResponse } from 'next/server'

import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuthLight } from '@/lib/api-auth'

import { findProjectBatch, mapChapterBatch } from '../_shared'

export const GET = apiHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; batchId: string }> },
) => {
  const { projectId, batchId } = await params
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const { batch } = await findProjectBatch(projectId, batchId)
  return NextResponse.json({ batch: mapChapterBatch(batch) })
})
