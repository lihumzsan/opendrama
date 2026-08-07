import { describe, expect, it } from 'vitest'
import {
  formatEpisodeSceneHeading,
  getEpisodeScreenplayNextAction,
} from '@/lib/novel-promotion/screenplay/display'

describe('episode screenplay display', () => {
  it('formats a structured scene heading for readers', () => {
    expect(formatEpisodeSceneHeading(JSON.stringify({
      intExt: 'INT',
      location: '医生办公室',
      time: '夜间',
    }))).toBe('内景 · 医生办公室 · 夜间')
  })

  it('keeps a plain-text scene heading unchanged', () => {
    expect(formatEpisodeSceneHeading('医院走廊 · 夜间')).toBe('医院走廊 · 夜间')
  })

  it('offers storyboard generation once the episode has scenes', () => {
    expect(getEpisodeScreenplayNextAction({ sceneCount: 7, isGenerating: false })).toEqual({
      visible: true,
      label: '确认剧本，生成分镜',
      disabled: false,
    })
  })

  it('disables storyboard generation while it is already running', () => {
    expect(getEpisodeScreenplayNextAction({ sceneCount: 7, isGenerating: true })).toMatchObject({
      visible: true,
      disabled: true,
    })
  })
})
