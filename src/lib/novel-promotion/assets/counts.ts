export function getAssetDefinitionCounts(input: {
  characterCount: number
  appearanceCount: number
  locationCount: number
  propCount: number
}) {
  return {
    total: input.characterCount + input.locationCount + input.propCount,
    characters: input.characterCount,
    appearances: input.appearanceCount,
    locations: input.locationCount,
    props: input.propCount,
  }
}
