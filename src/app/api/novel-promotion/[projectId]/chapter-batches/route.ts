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
  parseCreatedEpisodeIds,
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
  const replaceExisting = body.replaceExisting === true
  const batch = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.novelPromotionChapterBatch.findFirst({
      where: {
        novelPromotionProjectId: project.id,
        sourceFingerprint,
        status: { not: 'discarded' },
      },
    })
    if (duplicate) {
      if (!replaceExisting) {
        throw new ApiError('CONFLICT', {
          message: 'chapter batch with the same source text already exists',
          reason: 'duplicate_chapter_batch',
          batchId: duplicate.id,
          status: duplicate.status,
        })
      }
      if (duplicate.status === 'analyzing') {
        throw new ApiError('CONFLICT', {
          message: 'existing chapter batch is still being analyzed',
          reason: 'chapter_batch_analyzing',
          batchId: duplicate.id,
          status: duplicate.status,
        })
      }

      const createdEpisodeIds = parseCreatedEpisodeIds(duplicate)
      if (createdEpisodeIds.length > 0) {
        const currentProject = await tx.novelPromotionProject.findUnique({
          where: { id: project.id },
          select: { lastEpisodeId: true },
        })
        await tx.novelPromotionEpisode.deleteMany({
          where: {
            id: { in: createdEpisodeIds },
            novelPromotionProjectId: project.id,
          },
        })
        if (currentProject?.lastEpisodeId && createdEpisodeIds.includes(currentProject.lastEpisodeId)) {
          const replacementLastEpisode = await tx.novelPromotionEpisode.findFirst({
            where: { novelPromotionProjectId: project.id },
            orderBy: { episodeNumber: 'asc' },
            select: { id: true },
          })
          await tx.novelPromotionProject.update({
            where: { id: project.id },
            data: { lastEpisodeId: replacementLastEpisode?.id || null },
          })
        }
      }
      await tx.novelPromotionChapterBatch.delete({ where: { id: duplicate.id } })
    }

    return await tx.novelPromotionChapterBatch.create({
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
  })

  return NextResponse.json({ batch: mapChapterBatch(batch) }, { status: 201 })
})
