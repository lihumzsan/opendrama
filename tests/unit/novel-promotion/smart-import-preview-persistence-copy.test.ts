import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

type SmartImportMessages = {
  analyzing: {
    autoSave: string
  }
  preview: {
    autoSaved: string
  }
}

function readMessages(locale: 'en' | 'zh'): SmartImportMessages {
  return JSON.parse(
    readFileSync(join(process.cwd(), `messages/${locale}/smartImport.json`), 'utf8'),
  ) as SmartImportMessages
}

describe('smart import preview persistence copy', () => {
  test('states that AI split results remain a preview until confirmation', () => {
    const zh = readMessages('zh')
    const en = readMessages('en')

    expect(zh.analyzing.autoSave).toBe('分析完成后可预览，确认后保存')
    expect(zh.preview.autoSaved).toBe('尚未保存，确认后生效')
    expect(en.analyzing.autoSave).toBe('Preview the result after analysis, then confirm to save')
    expect(en.preview.autoSaved).toBe('Not saved yet; confirm to apply')
  })
})
