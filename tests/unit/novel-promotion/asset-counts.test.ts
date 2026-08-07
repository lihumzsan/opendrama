import { describe, expect, it } from 'vitest'

import { getAssetDefinitionCounts } from '@/lib/novel-promotion/assets/counts'

describe('asset definition counts', () => {
  it('counts character profiles even before they have generated appearances', () => {
    expect(getAssetDefinitionCounts({
      characterCount: 10,
      appearanceCount: 0,
      locationCount: 5,
      propCount: 0,
    })).toEqual({
      total: 15,
      characters: 10,
      appearances: 0,
      locations: 5,
      props: 0,
    })
  })
})
