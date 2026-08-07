import { NextResponse } from 'next/server'
import type { Prisma, NovelPromotionChapterBatch, NovelPromotionProject } from '@prisma/client'

import { ApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { validateCandidateEpisodePlans } from '@/lib/novel-promotion/chapter-batch/validation'
import type { CandidateEpisodeDraft, CandidateEpisodePlan } from '@/lib/novel-promotion/chapter-batch/types'

type ProjectRef = Pick<NovelPromotionProject, 'id'>
type BatchRef = NovelPromotionChapterBatch
type ConfirmMode = 'append' | 'update_current'

export function normalizeOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function normalizeRequiredText(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError('INVALID_PARAMS', { message: `${field} is required` })
  }
  return value.replace(/\r\n/g, '\n').trim()
}

export function readConfirmMode(value: unknown): ConfirmMode {
  return value === 'update_current' ? 'update_current' : 'append'
}

export function mapChapterBatch(batch: BatchRef) {
  return {
    id: batch.id,
    title: batch.title,
    sourceText: batch.sourceText,
    sourceFingerprint: batch.sourceFingerprint,
    chapterStartLabel: batch.chapterStartLabel,
    chapterEndLabel: batch.chapterEndLabel,
    status: batch.status,
    analysisJson: batch.analysisJson,
    candidateEpisodesJson: batch.candidateEpisodesJson,
    selectedPlanJson: batch.selectedPlanJson,
    createdEpisodeIdsJson: batch.createdEpisodeIdsJson,
    errorJson: batch.errorJson,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  }
}

export async function findNovelProject(projectId: string): Promise<ProjectRef> {
  const project = await prisma.novelPromotionProject.findFirst({ where: { projectId }, select: { id: true } })
  if (!project) throw new ApiError('NOT_FOUND')
  return project
}

export async function findProjectBatch(projectId: string, batchId: string) {
  const project = await findNovelProject(projectId)
  const batch = await prisma.novelPromotionChapterBatch.findUnique({ where: { id: batchId } })
  if (!batch || batch.novelPromotionProjectId !== project.id) throw new ApiError('NOT_FOUND')
  return { project, batch }
}

export function parseCreatedEpisodeIds(batch: BatchRef) {
  if (!batch.createdEpisodeIdsJson) return []
  const parsed = JSON.parse(batch.createdEpisodeIdsJson) as unknown
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === 'string' && !!item.trim())
    : []
}

export async function returnIdempotentConfirm(batch: BatchRef) {
  const ids = parseCreatedEpisodeIds(batch)
  if (batch.status !== 'confirmed' || ids.length === 0) return null
  const episodes = await prisma.novelPromotionEpisode.findMany({
    where: { id: { in: ids } },
    orderBy: { episodeNumber: 'asc' },
    select: { id: true, episodeNumber: true, name: true },
  })
  return NextResponse.json({ success: true, idempotent: true, episodes })
}

export function selectCandidatePlan(batch: BatchRef, planId: string): CandidateEpisodePlan {
  if (!batch.candidateEpisodesJson) {
    throw new ApiError('INVALID_PARAMS', { message: 'candidate episodes are required before confirm' })
  }
  const plans = validateCandidateEpisodePlans(batch.sourceText, JSON.parse(batch.candidateEpisodesJson))
  const plan = plans.find((item) => item.planId === planId)
  if (!plan) throw new ApiError('INVALID_PARAMS', { message: `plan ${planId} not found` })
  return plan
}

export function buildEpisodeDescription(episode: CandidateEpisodeDraft) {
  return [
    episode.description,
    `核心目标：${episode.coreGoal}`,
    `戏剧弧线：${episode.dramaticArc}`,
    `结尾钩子：${episode.endingHook}`,
  ].join('\n')
}

export async function countEpisodeDependents(episodeId: string) {
  const [screenplays, clips, shots, storyboards, voiceLines] = await Promise.all([
    prisma.novelPromotionScreenplay.count({ where: { episodeId } }),
    prisma.novelPromotionClip.count({ where: { episodeId } }),
    prisma.novelPromotionShot.count({ where: { episodeId } }),
    prisma.novelPromotionStoryboard.count({ where: { episodeId } }),
    prisma.novelPromotionVoiceLine.count({ where: { episodeId } }),
  ])
  return { screenplays, clips, shots, storyboards, voiceLines }
}

export function hasDependents(dependents: Record<string, number>) {
  return Object.values(dependents).some((count) => count > 0)
}

export async function materializeCandidatePlan(params: {
  project: ProjectRef
  batch: BatchRef
  plan: CandidateEpisodePlan
  mode: ConfirmMode
  episodeId?: string | null
  confirmOverwrite: boolean
}) {
  if (params.mode === 'update_current') {
    if (!params.episodeId || params.plan.episodes.length !== 1) {
      throw new ApiError('INVALID_PARAMS', {
        message: 'update_current requires one candidate episode and episodeId',
        mode: params.mode,
      })
    }
    const target = await prisma.novelPromotionEpisode.findFirst({
      where: { id: params.episodeId, novelPromotionProjectId: params.project.id },
      select: { id: true },
    })
    if (!target) throw new ApiError('NOT_FOUND')
    const dependents = await countEpisodeDependents(params.episodeId)
    if (hasDependents(dependents) && !params.confirmOverwrite) {
      throw new ApiError('INVALID_PARAMS', {
        message: 'update_current would replace existing generated content; confirmOverwrite=true is required',
        mode: params.mode,
        dependents,
      })
    }
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const createdEpisodes = []
    if (params.mode === 'update_current') {
      const draft = params.plan.episodes[0]
      if (!draft || !params.episodeId) throw new ApiError('INVALID_PARAMS')
      if (params.confirmOverwrite) {
        await tx.novelPromotionScreenplay.deleteMany({ where: { episodeId: params.episodeId } })
        await tx.novelPromotionVoiceLine.deleteMany({ where: { episodeId: params.episodeId } })
        await tx.novelPromotionStoryboard.deleteMany({ where: { episodeId: params.episodeId } })
        await tx.novelPromotionShot.deleteMany({ where: { episodeId: params.episodeId } })
        await tx.novelPromotionClip.deleteMany({ where: { episodeId: params.episodeId } })
      }
      const updated = await tx.novelPromotionEpisode.update({
        where: { id: params.episodeId },
        data: {
          name: draft.name,
          description: buildEpisodeDescription(draft),
          novelText: draft.sourceText,
        },
        select: { id: true, episodeNumber: true, name: true },
      })
      createdEpisodes.push(updated)
    } else {
      const lastEpisode = await tx.novelPromotionEpisode.findFirst({
        where: { novelPromotionProjectId: params.project.id },
        orderBy: { episodeNumber: 'desc' },
        select: { episodeNumber: true },
      })
      const startNumber = (lastEpisode?.episodeNumber || 0) + 1
      for (let index = 0; index < params.plan.episodes.length; index += 1) {
        const draft = params.plan.episodes[index]
        if (!draft) continue
        const created = await tx.novelPromotionEpisode.create({
          data: {
            novelPromotionProjectId: params.project.id,
            episodeNumber: startNumber + index,
            name: draft.name,
            description: buildEpisodeDescription(draft),
            novelText: draft.sourceText,
          },
          select: { id: true, episodeNumber: true, name: true },
        })
        createdEpisodes.push(created)
      }
    }

    await tx.novelPromotionChapterBatch.update({
      where: { id: params.batch.id },
      data: {
        status: 'confirmed',
        selectedPlanJson: JSON.stringify(params.plan),
        createdEpisodeIdsJson: JSON.stringify(createdEpisodes.map((episode) => episode.id)),
        errorJson: null,
      },
    })
    await tx.novelPromotionProject.update({
      where: { id: params.project.id },
      data: {
        lastEpisodeId: createdEpisodes[0]?.id || null,
        importStatus: 'completed',
      },
    })

    return createdEpisodes
  })
}
