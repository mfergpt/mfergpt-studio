/**
 * Per-collection configuration for the Mfer Creator.
 *
 * Hybrid approach (Option C):
 *  - Collections with explicit configs get custom trait tabs, ordering, and display names.
 *  - Collections without configs auto-discover traits from the API layer data.
 */

// A single trait category definition
export interface TraitDef {
  key: string          // internal key used in traits state (e.g. "fur", "hat_over")
  folder: string       // actual folder name on disk (e.g. "fur", "hat over headphones")
  label: string        // display label in UI tab
  mandatory?: boolean  // if true, always picked during random generation
}

export interface CollectionConfig {
  id: string
  name: string
  creator: string
  creatorUrl?: string
  traits: TraitDef[]   // ordered bottom-to-top for layer compositing
}

// ---------- OG mfer trait definitions (shared baseline) ----------

export const OG_TRAITS: TraitDef[] = [
  { key: 'background', folder: 'background',              label: 'background',   mandatory: true },
  { key: 'type',       folder: 'type',                    label: 'type',         mandatory: true },
  { key: 'shirt',      folder: 'shirt',                   label: 'shirt' },
  { key: 'chain',      folder: 'chain',                   label: 'chain' },
  { key: 'watch',      folder: '4_20 watch',              label: 'watch' },
  { key: 'beard',      folder: 'beard',                   label: 'beard' },
  { key: 'eyes',       folder: 'eyes',                    label: 'eyes',         mandatory: true },
  { key: 'short_hair', folder: 'short hair',              label: 'short hair' },
  { key: 'long_hair',  folder: 'long hair',               label: 'long hair' },
  { key: 'hat_under',  folder: 'hat under headphones',    label: 'hat (under)' },
  { key: 'headphones', folder: 'headphones',              label: 'headphones',   mandatory: true },
  { key: 'hat_over',   folder: 'hat over headphones',     label: 'hat (over)' },
  { key: 'mouth',      folder: 'mouth',                   label: 'mouth',        mandatory: true },
  { key: 'smoke',      folder: 'smoke',                   label: 'smoke' },
]

// Fine Art has same structure as OG but missing chain
const FINEART_TRAITS: TraitDef[] = OG_TRAITS.filter(t => t.key !== 'chain')

// Extended has same structure as OG but missing some categories
const EXTENDED_TRAITS: TraitDef[] = OG_TRAITS.filter(
  t => !['chain', 'beard', 'short_hair'].includes(t.key)
)

// Sketchy has an extra "modifiers" layer at the top
const SKETCHY_TRAITS: TraitDef[] = [
  ...OG_TRAITS,
  { key: 'modifiers', folder: 'modifiers', label: 'modifiers' },
]

// ---------- MFPurrs — cats, completely different traits ----------

const MFPURRS_TRAITS: TraitDef[] = [
  { key: 'background', folder: 'background',  label: 'background',  mandatory: true },
  { key: 'fur',        folder: 'fur',         label: 'fur',         mandatory: true },
  { key: 'clothing',   folder: 'clothing',    label: 'clothing' },
  { key: 'chain',      folder: 'chain',       label: 'chain' },
  { key: 'eyewear',    folder: 'eyewear',     label: 'eyewear' },
  { key: 'eye_color',  folder: 'eye_color',   label: 'eye color',   mandatory: true },
  { key: 'hat',        folder: 'hat',         label: 'hat' },
  { key: 'mouth',      folder: 'mouth',       label: 'mouth',       mandatory: true },
  { key: 'smoke',      folder: 'smoke',       label: 'smoke' },
  { key: 'piercing',   folder: 'piercing',    label: 'piercing' },
]

// ---------- Tiny Dinos — dinosaurs, completely different traits ----------

const TINYDINOS_TRAITS: TraitDef[] = [
  { key: 'background', folder: 'background',  label: 'background',  mandatory: true },
  { key: 'body',       folder: 'body',        label: 'body',        mandatory: true },
  { key: 'chest',      folder: 'chest',       label: 'chest',       mandatory: true },
  { key: 'eyes',       folder: 'eyes',        label: 'eyes',        mandatory: true },
  { key: 'spikes',     folder: 'spikes',      label: 'spikes' },
  { key: 'face',       folder: 'face',        label: 'face' },
  { key: 'feet',       folder: 'feet',        label: 'feet' },
  { key: 'hands',      folder: 'hands',       label: 'hands' },
  { key: 'head',       folder: 'head',        label: 'head' },
]

// ---------- Collection registry ----------

export const COLLECTION_CONFIGS: Record<string, CollectionConfig> = {
  og: {
    id: 'og',
    name: 'OG mfers',
    creator: 'sartoshi',
    creatorUrl: 'https://x.com/saborarchive',
    traits: OG_TRAITS,
  },
  extended: {
    id: 'extended',
    name: 'Extended',
    creator: 'sartoshi',
    creatorUrl: 'https://x.com/saborarchive',
    traits: EXTENDED_TRAITS,
  },
  creyzies: {
    id: 'creyzies',
    name: 'Creyzies',
    creator: 'creyzies',
    creatorUrl: 'https://x.com/creaboratory',
    traits: OG_TRAITS,
  },
  eos: {
    id: 'eos',
    name: 'EOS',
    creator: 'eos',
    creatorUrl: 'https://x.com/eos_mfers',
    traits: OG_TRAITS,
  },
  fineart: {
    id: 'fineart',
    name: 'Fine Art Mfers',
    creator: 'fine art mfers',
    creatorUrl: 'https://x.com/fineartmfers',
    traits: FINEART_TRAITS,
  },
  mfersahead: {
    id: 'mfersahead',
    name: 'Mfers Ahead',
    creator: 'mfers ahead',
    creatorUrl: 'https://x.com/mfersAhead',
    traits: OG_TRAITS,
  },
  mfersbehind: {
    id: 'mfersbehind',
    name: 'Mfers Behind',
    creator: 'mfers behind',
    creatorUrl: 'https://x.com/MfersBehind',
    traits: OG_TRAITS,
  },
  sketchy: {
    id: 'sketchy',
    name: 'Sketchy Mfers',
    creator: 'sketchy mfers',
    creatorUrl: 'https://x.com/sketchymfersnft',
    traits: SKETCHY_TRAITS,
  },
  somfers: {
    id: 'somfers',
    name: 'Somfers',
    creator: 'somfers',
    creatorUrl: 'https://x.com/somfers_',
    traits: OG_TRAITS,
  },
  mfpurrs: {
    id: 'mfpurrs',
    name: 'MFPurrs',
    creator: 'mfpurrs',
    creatorUrl: 'https://x.com/MFPurrs',
    traits: MFPURRS_TRAITS,
  },
  mpher: {
    id: 'mpher',
    name: 'MFpher',
    creator: 'mpher',
    creatorUrl: 'https://x.com/maboroshi_eth',
    traits: OG_TRAITS,
  },
  tinydinos: {
    id: 'tinydinos',
    name: 'Tiny Dinos',
    creator: 'tiny dinos',
    creatorUrl: 'https://x.com/TinyDinosNFT',
    traits: TINYDINOS_TRAITS,
  },
  '3d': {
    id: '3d',
    name: '3D Avatars',
    creator: 'mfer avatars',
    creatorUrl: 'https://x.com/mferavatars',
    traits: OG_TRAITS,
  },
}

/**
 * Build trait definitions for a collection that has no explicit config.
 * Auto-discovers from API layer data (folder names → trait defs).
 */
export function autoDiscoverTraits(layerData: Record<string, string[]>): TraitDef[] {
  const traits: TraitDef[] = []

  // First, try to match known OG folders to preserve good ordering
  const matched = new Set<string>()
  for (const ogTrait of OG_TRAITS) {
    if (layerData[ogTrait.folder]) {
      traits.push({ ...ogTrait })
      matched.add(ogTrait.folder)
    }
  }

  // Then append any folders we didn't match (collection-specific traits)
  for (const folder of Object.keys(layerData)) {
    if (matched.has(folder)) continue
    const key = folder.toLowerCase().replace(/[\s-]+/g, '_')
    traits.push({
      key,
      folder,
      label: folder.replace(/_/g, ' '),
    })
  }

  return traits
}

/**
 * Get the trait config for a collection. Uses explicit config if available,
 * otherwise falls back to auto-discovery from API data.
 */
export function getCollectionTraits(
  collectionId: string,
  layerData?: Record<string, string[]>,
): TraitDef[] {
  const config = COLLECTION_CONFIGS[collectionId]
  if (config) return config.traits

  // Auto-discover from API data
  if (layerData) return autoDiscoverTraits(layerData)

  // Fallback: OG traits
  return OG_TRAITS
}

/**
 * Get collection display info (name + creator).
 */
export function getCollectionInfo(collectionId: string): { name: string; creator: string; creatorUrl?: string } {
  const config = COLLECTION_CONFIGS[collectionId]
  if (config) return { name: config.name, creator: config.creator, creatorUrl: config.creatorUrl }
  return { name: collectionId, creator: 'unknown' }
}
