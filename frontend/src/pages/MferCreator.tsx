import { useState, useEffect, useRef, useCallback } from 'react'
import { COLLECTIONS } from '../lib/wagmi'

// --- Constants ---

// Layer z-order (bottom to top) — keys used in traits state
const LAYER_ORDER = [
  'background', 'type', 'shirt', 'chain', 'watch', 'beard',
  'eyes', 'short_hair', 'long_hair', 'hat_under', 'headphones',
  'hat_over', 'mouth', 'smoke',
] as const

type TraitKey = typeof LAYER_ORDER[number]

// Map trait keys → actual folder names on disk (OG collection)
const FOLDER_MAP: Record<string, string> = {
  background: 'background',
  type: 'type',
  eyes: 'eyes',
  mouth: 'mouth',
  headphones: 'headphones',
  hat_over: 'hat over headphones',
  hat_under: 'hat under headphones',
  short_hair: 'short hair',
  long_hair: 'long hair',
  shirt: 'shirt',
  chain: 'chain',
  watch: '4_20 watch',
  beard: 'beard',
  smoke: 'smoke',
}

// Display labels for UI tabs
const CATEGORIES: { key: TraitKey; label: string }[] = [
  { key: 'background', label: 'background' },
  { key: 'type', label: 'type' },
  { key: 'eyes', label: 'eyes' },
  { key: 'mouth', label: 'mouth' },
  { key: 'headphones', label: 'headphones' },
  { key: 'hat_over', label: 'hat (over)' },
  { key: 'hat_under', label: 'hat (under)' },
  { key: 'short_hair', label: 'short hair' },
  { key: 'long_hair', label: 'long hair' },
  { key: 'shirt', label: 'shirt' },
  { key: 'chain', label: 'chain' },
  { key: 'watch', label: 'watch' },
  { key: 'beard', label: 'beard' },
  { key: 'smoke', label: 'smoke' },
]

// --- Save/Load ---

interface SavedMfer {
  id: string
  name: string
  traits: Record<string, string>
  collection: string
  createdAt: string
}

const STORAGE_KEY = 'mfergpt-saved-mfers'
const MAX_SAVED = 50

function loadSaved(): SavedMfer[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function persistSaved(mfers: SavedMfer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mfers.slice(0, MAX_SAVED)))
}

// --- Helpers ---

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getDefaultTraits(): Record<string, string> {
  const traits: Record<string, string> = {}
  for (const { key } of CATEGORIES) traits[key] = 'none'
  return traits
}

// --- Image cache ---

const imageCache = new Map<string, HTMLImageElement>()

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached && cached.complete && cached.naturalWidth > 0) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imageCache.set(src, img); resolve(img) }
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
}

// Derivative dir map (must match backend DERIVATIVE_DIR_MAP)
const DERIVATIVE_DIR_MAP: Record<string, string> = {
  creyzies: 'creyzies', eos: 'eos', fineart: 'fineArtMfers',
  mfersahead: 'mfersAhead', mfersbehind: 'mfersBehind',
  sketchy: 'sketchyMfers', somfers: 'somfers', mfpurrs: 'mfpurrs',
  extended: 'extended',
}

// Build the URL for a layer PNG
function layerUrl(collection: string, folderName: string, fileName: string): string {
  if (collection === 'og') {
    return `/layers/og/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`
  }
  const dir = DERIVATIVE_DIR_MAP[collection] || collection
  return `/layers/derivatives/${encodeURIComponent(dir)}/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`
}

// Resolve an OG trait filename to the derivative filename using the trait map.
// Returns the mapped filename (with .png), or null if the trait is unavailable.
function resolveTraitFile(
  traitMap: Record<string, Record<string, string | null>>,
  folderName: string,
  ogFileName: string,
): string | null {
  const categoryMap = traitMap[folderName]
  if (!categoryMap) return ogFileName // no mapping for this folder — use as-is
  const ogName = ogFileName.replace(/\.png$/i, '')
  const mapped = categoryMap[ogName]
  if (mapped === undefined) return ogFileName // not in map — try as-is
  if (mapped === null) return null // explicitly unavailable
  return mapped + '.png'
}

// --- Types for layer data ---

// API returns { "folder name": ["file1.png", "file2.png", ...] }
type LayerData = Record<string, string[]>

// Reverse map: from folder name back to trait key
function buildFolderToKey(layerData: LayerData): Record<string, TraitKey> {
  const result: Record<string, TraitKey> = {}
  // First, try exact matches from FOLDER_MAP
  for (const [key, folder] of Object.entries(FOLDER_MAP)) {
    if (layerData[folder]) result[folder] = key as TraitKey
  }
  // For derivatives with different folder names, map by similarity
  for (const folder of Object.keys(layerData)) {
    if (result[folder]) continue
    const lower = folder.toLowerCase().replace(/[_\s-]+/g, '')
    for (const [key, ogFolder] of Object.entries(FOLDER_MAP)) {
      const ogLower = ogFolder.toLowerCase().replace(/[_\s-]+/g, '')
      if (lower === ogLower || lower.includes(ogLower) || ogLower.includes(lower)) {
        result[folder] = key as TraitKey
        break
      }
    }
  }
  return result
}

// --- Component ---

export default function MferCreator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [traits, setTraits] = useState<Record<string, string>>(getDefaultTraits())
  const [collection, setCollection] = useState<string>('og')
  const [saved, setSaved] = useState<SavedMfer[]>(loadSaved())
  const [saveName, setSaveName] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<TraitKey>('background')

  // Layer data from API: trait key → list of filenames
  const [layerOptions, setLayerOptions] = useState<Record<string, string[]>>({})
  // Folder name mapping for current collection
  const [keyToFolder, setKeyToFolder] = useState<Record<string, string>>(FOLDER_MAP)
  const [loading, setLoading] = useState(true)
  // Track which categories are missing in current collection
  const [missingCategories, setMissingCategories] = useState<Set<string>>(new Set())
  // Trait map: OG→derivative filename mapping (fetched per collection)
  const [traitMap, setTraitMap] = useState<Record<string, Record<string, string | null>>>({})

  // Fetch layers and trait map when collection changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const layersPromise = fetch(`/api/layers/${collection}`).then(r => r.json())
    const mapPromise = collection !== 'og'
      ? fetch(`/api/trait-map/${collection}`).then(r => r.json()).catch(() => ({}))
      : Promise.resolve({})

    Promise.all([layersPromise, mapPromise])
      .then(([data, map]: [LayerData, Record<string, Record<string, string | null>>]) => {
        if (cancelled) return
        setTraitMap(map)

        const folderToKey = buildFolderToKey(data)
        const options: Record<string, string[]> = {}
        const k2f: Record<string, string> = {}
        const missing = new Set<string>()

        for (const { key } of CATEGORIES) {
          // Find folder for this key
          let folder: string | undefined
          // Check direct FOLDER_MAP first
          if (data[FOLDER_MAP[key]]) {
            folder = FOLDER_MAP[key]
          } else {
            // Check reverse map
            for (const [f, k] of Object.entries(folderToKey)) {
              if (k === key) { folder = f; break }
            }
          }
          if (folder && data[folder]) {
            options[key] = data[folder]
            k2f[key] = folder
          } else {
            options[key] = []
            k2f[key] = FOLDER_MAP[key]
            missing.add(key)
          }
        }
        setLayerOptions(options)
        setKeyToFolder(k2f)
        setMissingCategories(missing)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [collection])

  // Composite canvas whenever traits or collection change
  const compositeCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 1000, 1000)

    for (const key of LAYER_ORDER) {
      const value = traits[key]
      if (value === 'none' || !value) continue
      if (missingCategories.has(key)) continue

      const folder = keyToFolder[key]
      if (!folder) continue

      // For derivative collections, resolve OG filename → derivative filename
      let fileName = value
      if (collection !== 'og' && Object.keys(traitMap).length > 0) {
        const resolved = resolveTraitFile(traitMap, folder, value)
        if (resolved === null) continue // trait unavailable in this collection
        fileName = resolved
      }

      const src = layerUrl(collection, folder, fileName)
      try {
        const img = await loadImage(src)
        ctx.drawImage(img, 0, 0, 1000, 1000)
      } catch {
        // Layer missing — skip silently
      }
    }
  }, [traits, collection, keyToFolder, missingCategories, traitMap])

  useEffect(() => {
    compositeCanvas()
  }, [compositeCanvas])

  // --- Handlers ---

  const setTrait = (category: string, value: string) => {
    setTraits(prev => ({ ...prev, [category]: value }))
  }

  const handleRandom = () => {
    const options = layerOptions
    const t = getDefaultTraits()

    for (const { key } of CATEGORIES) {
      const files = options[key] || []
      if (files.length === 0) continue
      // Mandatory traits: always picked (matches avatar-maker)
      const MANDATORY = ['background', 'type', 'eyes', 'mouth', 'headphones']
      if (MANDATORY.includes(key) && key !== 'type' && key !== 'eyes') {
        t[key] = pick(files)
      } else if (key === 'type') {
        // Weighted type selection (matches avatar-maker)
        const r = Math.random() * 100
        const typeKeywords = r < 30 ? 'plain' : r < 60 ? 'charcoal' : r < 74 ? 'zombie' : r < 86 ? 'ape' : 'alien'
        const matched = files.find((f: string) => f.toLowerCase().includes(typeKeywords))
        t[key] = matched || pick(files)
      } else if (key === 'eyes') {
        // Exclude special eyes from random (zombie, alien — those get forced by type rules)
        const normalEyes = files.filter((f: string) => !['zombie', 'alien'].some(s => f.toLowerCase().includes(s)))
        t[key] = Math.random() < 0.2 ? 'none' : pick(normalEyes.length ? normalEyes : files)
      } else {
        // Optional traits: 20% chance (matches avatar-maker's 80% skip rate)
        t[key] = Math.random() < 0.8 ? 'none' : pick(files)
      }
    }

    // Conflict rules — ported from avatar-maker CharacterCreator.js
    const lo = (s: string) => s.toLowerCase()

    // Rule 1: hat_over vs hat_under conflict
    if (t.hat_over !== 'none' && t.hat_under !== 'none') {
      const isHoodieOver = lo(t.hat_over).includes('hoodie')
      const isBandanaUnder = lo(t.hat_under).includes('bandana')
      const isBeanieUnder = lo(t.hat_under).includes('beanie')
      // Hoodie + beanie = NOT OK
      if (isHoodieOver && isBeanieUnder) {
        t.hat_under = 'none'
      }
      // Hoodie + bandana = OK, everything else = conflict
      else if (!isHoodieOver || (!isBandanaUnder && !isBeanieUnder)) {
        Math.random() > 0.5 ? t.hat_over = 'none' : t.hat_under = 'none'
      }
    }

    // Rule 2: short_hair vs long_hair
    if (t.short_hair !== 'none' && t.long_hair !== 'none') {
      Math.random() > 0.5 ? t.short_hair = 'none' : t.long_hair = 'none'
    }

    // Rule 3: ape = no long hair (ALWAYS, not just random)
    if (lo(t.type).includes('ape')) t.long_hair = 'none'

    // Rule 4: shirt/hoodie vs chain conflict
    const hasHoodieUp = t.hat_over !== 'none' && lo(t.hat_over).includes('hoodie')
    const hasShirt = t.shirt !== 'none'
    const hasChain = t.chain !== 'none'
    if ((hasShirt || hasHoodieUp) && hasChain) {
      if (Math.random() > 0.5) {
        t.chain = 'none'
      } else {
        if (hasHoodieUp) t.hat_over = 'none'
        if (hasShirt) t.shirt = 'none'
      }
    }

    // Rule 5: shirt vs hoodie up conflict
    if (hasShirt && hasHoodieUp) {
      Math.random() > 0.5 ? t.hat_over = 'none' : t.shirt = 'none'
    }

    // Rule 6: mohawk/messy hair vs non-hoodie headwear
    const hasMohawkOrMessy = t.short_hair !== 'none' && (lo(t.short_hair).includes('mohawk') || lo(t.short_hair).includes('messy'))
    const hasNonHoodieHeadwear = (t.hat_over !== 'none' && !lo(t.hat_over).includes('hoodie')) || t.hat_under !== 'none'
    if (hasMohawkOrMessy && hasNonHoodieHeadwear) {
      if (Math.random() > 0.5) {
        t.short_hair = 'none'
      } else {
        if (t.hat_over !== 'none' && !lo(t.hat_over).includes('hoodie')) t.hat_over = 'none'
        t.hat_under = 'none'
      }
    }

    // Rule 7: top hat/pilot/cowboy removes ALL hair
    const topHeadwear = ['top hat', 'tophat', 'pilot', 'cowboy']
    if (t.hat_over !== 'none' && topHeadwear.some(h => lo(t.hat_over).includes(h))) {
      t.short_hair = 'none'
      t.long_hair = 'none'
    }

    // Rule 8: hoodie up removes all hair
    if (t.hat_over !== 'none' && lo(t.hat_over).includes('hoodie')) {
      t.short_hair = 'none'
      t.long_hair = 'none'
    }

    // Rule 9: zombie type → zombie eyes (force if regular)
    if (lo(t.type).includes('zombie')) {
      if (t.eyes === 'none' || lo(t.eyes).includes('regular')) {
        const zombieEyes = (options['eyes'] || []).find((e: string) => lo(e).includes('zombie'))
        if (zombieEyes) t.eyes = zombieEyes
      }
    } else if (t.eyes !== 'none' && lo(t.eyes).includes('zombie')) {
      // Non-zombie type can't have zombie eyes
      const regularEyes = (options['eyes'] || []).find((e: string) => lo(e).includes('regular'))
      t.eyes = regularEyes || 'none'
    }

    // Rule 10: alien type → alien eyes (if regular)
    if (lo(t.type).includes('alien') && (t.eyes === 'none' || lo(t.eyes).includes('regular'))) {
      const alienEyes = (options['eyes'] || []).find((e: string) => lo(e).includes('alien'))
      if (alienEyes) t.eyes = alienEyes
    }

    // Rule 11: type-specific trait weights for random selection
    // (plain 30%, charcoal 30%, zombie 14%, ape 12%, alien 10%, other 4%)
    // Already handled by pick() from available options — close enough

    setTraits(t)
  }

  const handleClear = () => {
    setTraits(getDefaultTraits())
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'mfer-custom.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    const mfer: SavedMfer = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: saveName.trim(),
      traits: { ...traits },
      collection,
      createdAt: new Date().toISOString(),
    }
    const updated = [mfer, ...saved].slice(0, MAX_SAVED)
    setSaved(updated)
    persistSaved(updated)
    setSaveName('')
  }

  const handleLoad = (mfer: SavedMfer) => {
    setTraits({ ...mfer.traits })
    setCollection(mfer.collection)
  }

  const handleDelete = (id: string) => {
    const updated = saved.filter(m => m.id !== id)
    setSaved(updated)
    persistSaved(updated)
  }

  const activeTraitCount = Object.values(traits).filter(v => v !== 'none').length
  const currentOptions = layerOptions[activeTab] || []
  const currentTraitValue = traits[activeTab]

  // Display name: strip .png extension
  const displayName = (filename: string) => filename.replace(/\.png$/i, '')

  // Thumbnail URL for a trait option
  const thumbUrl = (key: TraitKey, filename: string) => {
    const folder = keyToFolder[key]
    if (!folder) return ''
    return layerUrl(collection, folder, filename)
  }

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">Mfer Creator</h1>
      <p className="text-gray-400 mb-6">pick traits. real-time preview. free.</p>

      {/* Desktop: 3 columns. Mobile: stacked */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT SIDEBAR — controls (desktop) */}
        <div className="lg:w-56 shrink-0 space-y-4 order-2 lg:order-1">
          {/* Collection switcher */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">collection</label>
            <div className="flex flex-wrap gap-1">
              {COLLECTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setCollection(c)}
                  className={`px-2 py-0.5 rounded-full text-[10px] transition-all border
                    ${collection === c
                      ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                      : 'border-[#222] bg-[#111] text-gray-500 hover:border-[#444] hover:text-white'
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRandom}
              className="flex-1 bg-[#222] hover:bg-[#333] text-white py-2 rounded text-xs font-medium transition-colors border border-[#333]"
            >
              random
            </button>
            <button
              onClick={handleClear}
              className="flex-1 bg-[#222] hover:bg-[#333] text-white py-2 rounded text-xs font-medium transition-colors border border-[#333]"
            >
              clear
            </button>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={activeTraitCount === 0}
            className="w-full bg-[#00ff41] text-black font-bold py-2.5 rounded hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            download png
          </button>

          {/* Trait count */}
          <div className="text-xs text-gray-500">
            {activeTraitCount} trait{activeTraitCount !== 1 ? 's' : ''} selected
          </div>

          {/* Save */}
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="name this mfer..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              maxLength={30}
              className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:border-[#00ff41] outline-none"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="bg-[#222] hover:bg-[#333] text-white px-3 py-1.5 rounded text-xs transition-colors disabled:opacity-30 border border-[#333]"
            >
              save
            </button>
          </div>

          {/* Saved mfers */}
          {saved.length > 0 && (
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showSaved ? '\u25be' : '\u25b8'} saved ({saved.length})
            </button>
          )}

          {showSaved && saved.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {saved.map(m => (
                <div key={m.id} className="bg-[#111] border border-[#222] rounded p-1.5 flex items-center gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{m.name}</div>
                    <div className="text-[9px] text-gray-500">
                      {m.collection} &middot; {Object.values(m.traits).filter(v => v !== 'none').length} traits
                    </div>
                  </div>
                  <button onClick={() => handleLoad(m)} className="text-[9px] text-[#00ff41] hover:underline shrink-0">load</button>
                  <button onClick={() => handleDelete(m.id)} className="text-[9px] text-red-400 hover:underline shrink-0">del</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER — canvas preview */}
        <div className="flex-shrink-0 order-1 lg:order-2 flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={1000}
              height={1000}
              className="w-full max-w-[500px] lg:w-[500px] h-auto rounded-lg border border-[#222] bg-[#0a0a0a]"
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <span className="text-gray-400 text-sm">loading layers...</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — trait selectors */}
        <div className="flex-1 min-w-0 order-3">
          {/* Category tabs — horizontally scrollable */}
          <div className="flex overflow-x-auto gap-1 pb-2 mb-3 scrollbar-thin">
            {CATEGORIES.map(cat => {
              const isMissing = missingCategories.has(cat.key)
              const isActive = activeTab === cat.key
              const hasValue = traits[cat.key] !== 'none'
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveTab(cat.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all border shrink-0
                    ${isActive
                      ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                      : hasValue
                        ? 'border-[#00ff41]/30 bg-[#111] text-[#00ff41]/70'
                        : 'border-[#222] bg-[#111] text-gray-500 hover:border-[#444] hover:text-white'
                    }
                    ${isMissing ? 'opacity-40' : ''}
                  `}
                >
                  {isMissing && '\u26a0\ufe0f '}{cat.label}
                </button>
              )
            })}
          </div>

          {/* Current category label */}
          <div className="text-sm text-gray-400 mb-2">
            {CATEGORIES.find(c => c.key === activeTab)?.label}
            {currentTraitValue !== 'none' && (
              <span className="text-[#00ff41] ml-2">&middot; {displayName(currentTraitValue)}</span>
            )}
          </div>

          {/* Options grid with thumbnails */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-[60vh] lg:max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {/* None option */}
            <button
              onClick={() => setTrait(activeTab, 'none')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all
                ${currentTraitValue === 'none'
                  ? 'border-[#444] bg-[#222]'
                  : 'border-[#1a1a1a] bg-[#0d0d0d] hover:border-[#333]'
                }`}
            >
              <div className="w-full aspect-square rounded bg-[#111] flex items-center justify-center text-gray-600 text-lg">
                &times;
              </div>
              <span className="text-[10px] text-gray-500 truncate w-full text-center">none</span>
            </button>

            {currentOptions.map(filename => {
              const isSelected = currentTraitValue === filename
              const src = thumbUrl(activeTab, filename)
              return (
                <button
                  key={filename}
                  onClick={() => setTrait(activeTab, filename)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all
                    ${isSelected
                      ? 'border-[#00ff41] bg-[#00ff41]/5'
                      : 'border-[#1a1a1a] bg-[#0d0d0d] hover:border-[#333]'
                    }`}
                >
                  <div className="w-full aspect-square rounded bg-[#111] overflow-hidden relative">
                    <img
                      src={src}
                      alt={displayName(filename)}
                      loading="lazy"
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'auto' }}
                    />
                  </div>
                  <span className={`text-[10px] truncate w-full text-center ${isSelected ? 'text-[#00ff41]' : 'text-gray-500'}`}>
                    {displayName(filename)}
                  </span>
                </button>
              )
            })}
          </div>

          {missingCategories.has(activeTab) && (
            <p className="text-xs text-yellow-500 mt-2">
              this trait category is not available in the {collection} collection
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
