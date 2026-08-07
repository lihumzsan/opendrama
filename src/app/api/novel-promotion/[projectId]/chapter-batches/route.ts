import { NextRequest, NextResponse } from 'next/server'

import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuthLight } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { hashChapterBatchSource } from '@/lib/novel-promotion/chapter-batch/validation'

import {
  findNovelProject,
  mapChapterBatch,
  normalizeOptionalText,
  normalizeRequiredText,
} from './_shared'

export const GET = apiHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await params
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const project = await findNovelProject(projectId)
  const batches = await prisma.novelPromotionChapterBatch.findMany({
    where: { novelPromotionProjectId: project.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ batches: batches.map(mapChapterBatch) })
})

export const POST = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await params
  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const title = normalizeRequiredText(body.title, 'title')
  const sourceText = normalizeRequiredText(body.sourceText, 'sourceText')
  if (sourceText.length < 100) {
    throw new ApiError('INVALID_PARAMS', { message: 'sourceText must be at least 100 characters' })
  }

  const project = await findNovelProject(projectId)
  const sourceFingerprint = hashChapterBatchSource(sourceText)
  const duplicate = await prisma.novelPromotionChapterBatch.findFirst({
    where: {
      novelPromotionProjectId: project.id,
      sourceFingerprint,
      status: { not: 'discarded' },
    },
    select: { id: true, status: true },
  })
  if (duplicate) {
    throw new ApiError('INVALID_PARAMS', {
      message: 'chapter batch with the same source text already exists',
      batchId: duplicate.id,
      status: duplicate.status,
    })
  }

  const batch = await prisma.novelPromotionChapterBatch.create({
    data: {
      novelPromotionProjectId: project.id,
      title,
      sourceText,
      sourceFingerprint,
      chapterStartLabel: normalizeOptionalText(body.chapterStartLabel),
      chapterEndLabel: normalizeOptionalText(body.chapterEndLabel),
      status: 'draft',
    },
  })

  return NextResponse.json({ batch: mapChapterBatch(batch) }, { status: 201 })
})
