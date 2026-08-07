'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { logError as _ulogError, logInfo as _ulogInfo } from '@/lib/logging/core'
import { countWords } from '@/lib/word-count'
import {
  useAnalyzeChapterBatch,
  useConfirmChapterBatch,
  useCreateChapterBatch,
  useListProjectEpisodes,
  useSaveProjectEpisodesBatch,
} from '@/lib/query/hooks'
import type { DeleteConfirmState, SplitEpisode, WizardStage } from '../types'
import { mapChapterBatchPlanToSplitEpisodes } from '../chapter-batch-mapping'
import {
  mergeEpisodeWithNext,
  moveFirstSceneToPreviousEpisode,
  moveLastSceneToNextEpisode,
  splitEpisodeAfterScene,
} from '../preview-operations'

type TranslateValues = Record<string, string | number | Date>
type Translate = (key: string, values?: TranslateValues) => string

interface UseWizardStateParams {
  projectId: string
  importStatus?: string | null
  onImportComplete: (episodes: SplitEpisode[], triggerGlobalAnalysis?: boolean) => void
  t: Translate
  initialRawContent?: string
}

function cloneEpisodes(episodes: SplitEpisode[]): SplitEpisode[] {
  return episodes.map((episode) => ({
    ...episode,
    sceneIds: episode.sceneIds ? [...episode.sceneIds] : undefined,
    scenes: episode.scenes?.map((scene) => ({
      ...scene,
      characters: scene.characters ? [...scene.characters] : undefined,
      boundaryAfter: scene.boundaryAfter ? { ...scene.boundaryAfter } : undefined,
    })),
  }))
}

export function useWizardState({
  projectId,
  importStatus,
  onImportComplete,
  t,
  initialRawContent,
}: UseWizardStateParams) {
  const initialStage: WizardStage = importStatus === 'pending' ? 'preview' : 'select'
  const [stage, setStage] = useState<WizardStage>(initialStage)
  const [rawContent, setRawContent] = useState(initialRawContent || '')
  const [episodes, setEpisodes] = useState<SplitEpisode[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    index: -1,
    title: '',
  })
  const [saving, setSaving] = useState(false)
  const [splitProfile, setSplitProfile] = useState<'horizontal_motion_comic' | 'regular_episode' | null>(null)
  const [aiRecommendation, setAiRecommendation] = useState<SplitEpisode[] | null>(null)
  const [chapterBatchId, setChapterBatchId] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const listProjectEpisodesMutation = useListProjectEpisodes(projectId)
  const createChapterBatchMutation = useCreateChapterBatch(projectId)
  const analyzeChapterBatchMutation = useAnalyzeChapterBatch(projectId)
  const confirmChapterBatchMutation = useConfirmChapterBatch(projectId)
  const saveProjectEpisodesBatchMutation = useSaveProjectEpisodesBatch(projectId)

  const loadSavedEpisodes = useCallback(async () => {
    try {
      const data = await listProjectEpisodesMutation.mutateAsync()
      if (data.episodes && data.episodes.length > 0) {
        const loadedEpisodes: SplitEpisode[] = data.episodes.map(
          (
            ep: {
              episodeNumber?: number
              name?: string
              description?: string
              novelText?: string
            },
            idx: number,
          ) => ({
            number: ep.episodeNumber || idx + 1,
            title: ep.name || t('episode', { num: idx + 1 }),
            summary: ep.description || '',
            content: ep.novelText || '',
            wordCount: countWords(ep.novelText || ''),
          }),
        )
        setEpisodes(loadedEpisodes)
        setStage('preview')
      }
    } catch (err) {
      _ulogError('[SmartImport] failed to load saved episodes', err)
    }
  }, [listProjectEpisodesMutation, t])

  useEffect(() => {
    if (importStatus === 'pending' && episodes.length === 0) {
      void loadSavedEpisodes()
    }
  }, [episodes.length, importStatus, loadSavedEpisodes])

  const performAISplit = useCallback(async () => {
    setStage('analyzing')
    setError(null)

    try {
      _ulogInfo('[SmartImport] starting chapter batch analysis')
      const title = rawContent.split(/\r?\n/, 1)[0]?.trim().slice(0, 80) || t('smartImport.title')
      const created = await createChapterBatchMutation.mutateAsync({
        title,
        sourceText: rawContent,
      })
      const analyzed = await analyzeChapterBatchMutation.mutateAsync({ batchId: created.batch.id })
      const plan = analyzed.candidatePlans[0]
      if (!plan) {
        throw new Error(t('errors.analyzeFailed'))
      }
      const splitEpisodes = mapChapterBatchPlanToSplitEpisodes(plan)
      setEpisodes(splitEpisodes)
      setAiRecommendation(cloneEpisodes(splitEpisodes))
      setSplitProfile(null)
      setChapterBatchId(created.batch.id)
      setSelectedPlanId(plan.planId)
      _ulogInfo('[SmartImport] chapter batch analysis ready for preview; database will update only after confirmation', {
        batchId: created.batch.id,
        planId: plan.planId,
      })
      setStage('preview')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('errors.analyzeFailed')
      setError(message || t('errors.analyzeFailed'))
      setStage('select')
    }
  }, [analyzeChapterBatchMutation, createChapterBatchMutation, rawContent, t])

  const handleAnalyze = useCallback(async () => {
    _ulogInfo('[SmartImport] handleAnalyze called')
    _ulogInfo('[SmartImport] rawContent length:', rawContent.length)
    _ulogInfo('[SmartImport] projectId:', projectId)

    if (!rawContent.trim()) {
      setError(t('errors.uploadFirst'))
      return
    }

    _ulogInfo('[SmartImport] using AI chapter batch analysis')
    await performAISplit()
  }, [performAISplit, projectId, rawContent, t])

  const autoAnalyzeTriggered = useRef(false)
  useEffect(() => {
    if (initialRawContent && !autoAnalyzeTriggered.current && stage === 'select') {
      autoAnalyzeTriggered.current = true
      void handleAnalyze()
    }
  })

  const updateEpisodeTitle = useCallback((index: number, title: string) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, title } : ep)))
  }, [])

  const updateEpisodeSummary = useCallback((index: number, summary: string) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, summary } : ep)))
  }, [])

  const updateEpisodeNumber = useCallback((index: number, number: number) => {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, number } : ep)))
  }, [])

  const updateEpisodeContent = useCallback((index: number, content: string) => {
    setEpisodes((prev) =>
      prev.map((ep, i) => (i === index ? { ...ep, content, wordCount: countWords(content) } : ep)),
    )
  }, [])

  const deleteEpisode = useCallback((index: number) => {
    setEpisodes((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((_, i) => i !== index)
      setSelectedEpisode((current) => (current >= next.length ? Math.max(0, next.length - 1) : current))
      return next
    })
  }, [])

  const addEpisode = useCallback(() => {
    setEpisodes((prev) => {
      const newEpisode: SplitEpisode = {
        number: prev.length + 1,
        title: `${t('preview.newEpisode')} ${prev.length + 1}`,
        summary: '',
        content: '',
        wordCount: 0,
      }
      const next = [...prev, newEpisode]
      setSelectedEpisode(next.length - 1)
      return next
    })
  }, [t])

  const mergeWithNext = useCallback((index: number) => {
    setEpisodes((prev) => mergeEpisodeWithNext(prev, index))
    setSelectedEpisode(index)
  }, [])

  const splitAfterScene = useCallback((index: number, sceneId: string) => {
    setEpisodes((prev) => splitEpisodeAfterScene(prev, index, sceneId))
    setSelectedEpisode(index)
  }, [])

  const moveLastSceneForward = useCallback((index: number) => {
    setEpisodes((prev) => moveLastSceneToNextEpisode(prev, index))
  }, [])

  const moveFirstSceneBackward = useCallback((index: number) => {
    setEpisodes((prev) => moveFirstSceneToPreviousEpisode(prev, index))
  }, [])

  const resetAIRecommendation = useCallback(() => {
    if (!aiRecommendation) return
    setEpisodes(cloneEpisodes(aiRecommendation))
    setSelectedEpisode(0)
  }, [aiRecommendation])

  const openDeleteConfirm = useCallback((index: number, title: string) => {
    setDeleteConfirm({ show: true, index, title })
  }, [])

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirm({ show: false, index: -1, title: '' })
  }, [])

  const confirmDeleteEpisode = useCallback(() => {
    if (deleteConfirm.index >= 0) {
      deleteEpisode(deleteConfirm.index)
    }
    closeDeleteConfirm()
  }, [closeDeleteConfirm, deleteConfirm.index, deleteEpisode])

  const handleConfirm = useCallback(
    async (triggerGlobalAnalysis = false) => {
      setSaving(true)
      setError(null)

      try {
        if (chapterBatchId && selectedPlanId) {
          await confirmChapterBatchMutation.mutateAsync({
            batchId: chapterBatchId,
            planId: selectedPlanId,
            mode: 'append',
            episodes: episodes.map((ep) => ({
              name: ep.title,
              description: ep.summary,
              novelText: ep.content,
            })),
          })
        } else {
          await saveProjectEpisodesBatchMutation.mutateAsync({
            episodes: episodes.map((ep) => ({
              name: ep.title,
              description: ep.summary,
              novelText: ep.content,
            })),
            mode: 'append',
            importStatus: 'completed',
            triggerGlobalAnalysis,
          })
        }

        _ulogInfo('[SmartImport] episodes saved after confirmation', { triggerGlobalAnalysis })
        onImportComplete(episodes, triggerGlobalAnalysis)
      } catch (err: unknown) {
        _ulogError('[SmartImport] failed to save episodes', err)
        const message = err instanceof Error ? err.message : t('errors.saveFailed')
        setError(message || t('errors.saveFailed'))
      } finally {
        setSaving(false)
      }
    },
    [
      chapterBatchId,
      confirmChapterBatchMutation,
      episodes,
      onImportComplete,
      saveProjectEpisodesBatchMutation,
      selectedPlanId,
      t,
    ],
  )

  return {
    stage,
    setStage,
    rawContent,
    setRawContent,
    episodes,
    selectedEpisode,
    setSelectedEpisode,
    error,
    saving,
    splitProfile,
    canResetAIRecommendation: aiRecommendation !== null,
    deleteConfirm,
    handleAnalyze,
    performAISplit,
    updateEpisodeTitle,
    updateEpisodeSummary,
    updateEpisodeNumber,
    updateEpisodeContent,
    addEpisode,
    mergeWithNext,
    splitAfterScene,
    moveLastSceneForward,
    moveFirstSceneBackward,
    resetAIRecommendation,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDeleteEpisode,
    handleConfirm,
  }
}
