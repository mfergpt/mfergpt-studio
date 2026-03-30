import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react'
import { COLLECTIONS } from '../lib/wagmi'
import { getCollectionTraits, getCollectionInfo, type TraitDef } from '../lib/collections'
import type { ThreePreviewHandle } from '../components/ThreePreview'
import { TRAIT_MESH_MAPPING } from '../components/traitMeshMapping'

const ThreePreview = lazy(() => import('../components/ThreePreview'))

// Map TRAIT_MESH_MAPPING categories back to creator category keys
const CATEGORY_3D_REVERSE: Record<string, string> = {
  hat_over_headphones: 'hat_over',
  hat_under_headphones: 'hat_under',
}

// Build 3D layer options from TRAIT_MESH_MAPPING keys using given trait defs
function build3DLayerOptions(traitDefs: TraitDef[]): Record<string, string[]> {
  const options: Record<string, string[]> = {}
  for (const t of traitDefs) {
    const meshKey = t.key === 'hat_over' ? 'hat_over_headphones'
      : t.key === 'hat_under' ? 'hat_under_headphones'
      : t.key
    const mapping = TRAIT_MESH_MAPPING[meshKey]
    if (mapping) {
      options[t.key] = Object.keys(mapping)
    } else if (t.key === 'background') {
      options[t.key] = ['blue', 'red', 'green', 'yellow', 'orange', 'purple', 'turquoise', 'space', 'tree', 'graveyard']
    } else {
      options[t.key] = []
    }
  }
  return options
}

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
  tinydinos: 'tinyDinos', extended: 'extended',
}

// Build the URL for a layer PNG
function layerUrl(collection: string, folderName: string, fileName: string): string {
  if (collection === 'og') {
    return `/layers/og/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`
  }
  const dir = DERIVATIVE_DIR_MAP[collection] || collection
  return `/layers/derivatives/${encodeURIComponent(dir)}/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`
}

// --- Types for layer data ---

// API returns { "folder name": ["file1.png", "file2.png", ...] }
type LayerData = Record<string, string[]>

// --- Component ---

export default function MferCreator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const threeRef = useRef<ThreePreviewHandle>(null)
  const [collection, setCollection] = useState<string>('og')
  const [traits, setTraits] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<SavedMfer[]>(loadSaved())
  const [saveName, setSaveName] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('background')

  // Layer data from API: folder name → list of filenames
  const [layerData, setLayerData] = useState<LayerData>({})
  // Resolved layer options keyed by trait key
  const [layerOptions, setLayerOptions] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  // Current trait definitions (dynamic per collection)
  const [traitDefs, setTraitDefs] = useState<TraitDef[]>(() => getCollectionTraits('og'))

  // Collection info for attribution
  const collectionInfo = useMemo(() => getCollectionInfo(collection), [collection])

  // Build default traits (all 'none') from current trait defs
  const getDefaultTraits = useCallback((defs: TraitDef[]) => {
    const t: Record<string, string> = {}
    for (const d of defs) t[d.key] = 'none'
    return t
  }, [])

  // Fetch layers when collection changes, then resolve trait defs
  useEffect(() => {
    if (collection === '3d') {
      const defs = getCollectionTraits('3d')
      setTraitDefs(defs)
      const options = build3DLayerOptions(defs)
      setLayerOptions(options)
      setLayerData({})
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`/api/layers/${collection}`)
      .then(r => r.json())
      .then((data: LayerData) => {
        if (cancelled) return
        setLayerData(data)

        // Resolve trait definitions: config override or auto-discover
        const defs = getCollectionTraits(collection, data)

        // Build layerOptions keyed by trait key, matching folders from API data
        const options: Record<string, string[]> = {}
        for (const def of defs) {
          options[def.key] = data[def.folder] || []
        }

        setTraitDefs(defs)
        setLayerOptions(options)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [collection])

  // Reset traits and randomize when collection changes (traitDefs update)
  useEffect(() => {
    if (!loading && traitDefs.length > 0) {
      setActiveTab(traitDefs[0].key)
      handleRandom()
    }
  }, [loading, traitDefs])

  // Composite canvas whenever traits or collection change (2D only)
  const compositeCanvas = useCallback(async () => {
    if (collection === '3d') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 1000, 1000)

    // Draw layers in trait def order (bottom to top)
    for (const def of traitDefs) {
      const value = traits[def.key]
      if (value === 'none' || !value) continue

      const src = layerUrl(collection, def.folder, value)
      try {
        const img = await loadImage(src)
        ctx.drawImage(img, 0, 0, 1000, 1000)
      } catch {
        // Layer missing — skip silently
      }
    }
  }, [traits, collection, traitDefs])

  useEffect(() => {
    compositeCanvas()
  }, [compositeCanvas])

  // --- Handlers ---

  const setTrait = (key: string, value: string) => {
    setTraits(prev => ({ ...prev, [key]: value }))
  }

  const handleRandom = () => {
    const t = getDefaultTraits(traitDefs)
    const lo = (s: string) => s.toLowerCase()

    for (const def of traitDefs) {
      const files = layerOptions[def.key] || []
      if (files.length === 0) continue

      if (def.mandatory) {
        // Special handling for "type"-like traits (weighted)
        if (def.key === 'type') {
          const r = Math.random() * 100
          const kw = r < 30 ? 'plain' : r < 60 ? 'charcoal' : r < 74 ? 'zombie' : r < 86 ? 'ape' : 'alien'
          const matched = files.find((f: string) => lo(f).includes(kw))
          t[def.key] = matched || pick(files)
        } else if (def.key === 'eyes' || def.key === 'eyewear') {
          // Exclude special eyes from random
          const normalEyes = files.filter((f: string) => !['zombie', 'alien'].some(s => lo(f).includes(s)))
          t[def.key] = pick(normalEyes.length ? normalEyes : files)
        } else {
          t[def.key] = pick(files)
        }
      } else {
        // Optional traits: 20% chance
        t[def.key] = Math.random() < 0.8 ? 'none' : pick(files)
      }
    }

    // Conflict rules (only apply when relevant keys exist)
    const has = (key: string) => t[key] !== undefined && t[key] !== 'none'

    // hat_over vs hat_under conflict
    if (has('hat_over') && has('hat_under')) {
      const isHoodieOver = lo(t.hat_over).includes('hoodie')
      const isBandanaUnder = lo(t.hat_under).includes('bandana')
      const isBeanieUnder = lo(t.hat_under).includes('beanie')
      if (isHoodieOver && isBeanieUnder) {
        t.hat_under = 'none'
      } else if (!isHoodieOver || (!isBandanaUnder && !isBeanieUnder)) {
        Math.random() > 0.5 ? t.hat_over = 'none' : t.hat_under = 'none'
      }
    }

    // short_hair vs long_hair
    if (has('short_hair') && has('long_hair')) {
      Math.random() > 0.5 ? t.short_hair = 'none' : t.long_hair = 'none'
    }

    // ape = no long hair
    if (t.type && lo(t.type).includes('ape') && t.long_hair) t.long_hair = 'none'

    // shirt/hoodie vs chain
    if (t.hat_over !== undefined && t.shirt !== undefined && t.chain !== undefined) {
      const hasHoodieUp = has('hat_over') && lo(t.hat_over).includes('hoodie')
      const hasShirt = has('shirt')
      const hasChain = has('chain')
      if ((hasShirt || hasHoodieUp) && hasChain) {
        if (Math.random() > 0.5) {
          t.chain = 'none'
        } else {
          if (hasHoodieUp) t.hat_over = 'none'
          if (hasShirt) t.shirt = 'none'
        }
      }
      // shirt vs hoodie up
      if (hasShirt && hasHoodieUp) {
        Math.random() > 0.5 ? t.hat_over = 'none' : t.shirt = 'none'
      }
    }

    // mohawk/messy hair vs headwear
    if (t.short_hair !== undefined && has('short_hair')) {
      const hasMohawkOrMessy = lo(t.short_hair).includes('mohawk') || lo(t.short_hair).includes('messy')
      const hasNonHoodieHeadwear = (has('hat_over') && !lo(t.hat_over).includes('hoodie')) || has('hat_under')
      if (hasMohawkOrMessy && hasNonHoodieHeadwear) {
        if (Math.random() > 0.5) {
          t.short_hair = 'none'
        } else {
          if (t.hat_over !== undefined && !lo(t.hat_over).includes('hoodie')) t.hat_over = 'none'
          if (t.hat_under !== undefined) t.hat_under = 'none'
        }
      }
    }

    // top hat/pilot/cowboy removes ALL hair
    if (has('hat_over')) {
      const topHeadwear = ['top hat', 'tophat', 'pilot', 'cowboy']
      if (topHeadwear.some(h => lo(t.hat_over).includes(h))) {
        if (t.short_hair !== undefined) t.short_hair = 'none'
        if (t.long_hair !== undefined) t.long_hair = 'none'
      }
    }

    // hoodie up removes all hair
    if (has('hat_over') && lo(t.hat_over).includes('hoodie')) {
      if (t.short_hair !== undefined) t.short_hair = 'none'
      if (t.long_hair !== undefined) t.long_hair = 'none'
    }

    // zombie type → zombie eyes
    if (t.type && t.eyes !== undefined) {
      const eyeFiles = layerOptions['eyes'] || layerOptions['eyewear'] || []
      if (lo(t.type).includes('zombie')) {
        if (t.eyes === 'none' || lo(t.eyes).includes('regular')) {
          const zombieEyes = eyeFiles.find((e: string) => lo(e).includes('zombie'))
          if (zombieEyes) t.eyes = zombieEyes
        }
      } else if (t.eyes !== 'none' && lo(t.eyes).includes('zombie')) {
        const regularEyes = eyeFiles.find((e: string) => lo(e).includes('regular'))
        t.eyes = regularEyes || 'none'
      }
    }

    // alien type → alien eyes
    if (t.type && t.eyes !== undefined && lo(t.type).includes('alien') && (t.eyes === 'none' || lo(t.eyes).includes('regular'))) {
      const eyeFiles = layerOptions['eyes'] || layerOptions['eyewear'] || []
      const alienEyes = eyeFiles.find((e: string) => lo(e).includes('alien'))
      if (alienEyes) t.eyes = alienEyes
    }

    setTraits(t)
  }

  const handleClear = () => {
    setTraits(getDefaultTraits(traitDefs))
  }

  const handleDownload = () => {
    if (collection === '3d') {
      const dataUrl = threeRef.current?.captureScreenshot()
      if (!dataUrl) return
      const link = document.createElement('a')
      link.download = 'mfer-custom.png'
      link.href = dataUrl
      link.click()
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'mfer-custom.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleDownloadGlb = async () => {
    const data = await threeRef.current?.exportGlb()
    if (!data) return
    const blob = new Blob([data], { type: 'model/gltf-binary' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'mfer-custom.glb'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    // Only save traits from current collection's trait defs (no stale keys)
    const relevantTraits: Record<string, string> = {}
    for (const def of traitDefs) {
      relevantTraits[def.key] = traits[def.key] || 'none'
    }
    const mfer: SavedMfer = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: saveName.trim(),
      traits: relevantTraits,
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
  const currentTraitValue = traits[activeTab] || 'none'

  // Display name: strip .png extension and rarity weights (e.g. "cream#100" → "cream")
  const displayName = (filename: string) =>
    filename.replace(/\.png$/i, '').replace(/#\d+$/, '')

  // Thumbnail URL for a trait option
  const thumbUrl = (key: string, filename: string) => {
    const def = traitDefs.find(d => d.key === key)
    if (!def) return ''
    return layerUrl(collection, def.folder, filename)
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
              {COLLECTIONS.map(c => {
                const info = getCollectionInfo(c)
                return (
                  <button
                    key={c}
                    onClick={() => setCollection(c)}
                    className={`px-2 py-0.5 rounded-full text-[10px] transition-all border
                      ${collection === c
                        ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                        : 'border-[#222] bg-[#111] text-gray-500 hover:border-[#444] hover:text-white'
                      }`}
                    title={`by ${info.creator}`}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Creator attribution */}
          <div className="text-xs text-gray-500 border border-[#222] rounded px-2 py-1.5 bg-[#0a0a0a]">
            <span className="text-gray-400">{collectionInfo.name}</span>
            <span className="mx-1">&middot;</span>
            {collectionInfo.creatorUrl ? (
              <a
                href={collectionInfo.creatorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00ff41]/70 hover:text-[#00ff41] transition-colors"
              >
                {collectionInfo.creator}
              </a>
            ) : (
              <span>{collectionInfo.creator}</span>
            )}
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

          {collection === '3d' && (
            <button
              onClick={handleDownloadGlb}
              disabled={activeTraitCount === 0}
              className="w-full bg-[#222] hover:bg-[#333] text-[#00ff41] font-bold py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm border border-[#00ff41]/30"
            >
              download glb
            </button>
          )}

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
        <div className="flex-shrink-0 order-1 lg:order-2 flex flex-col items-center gap-2">
          <div className="relative">
            {collection !== '3d' ? (
              <>
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
              </>
            ) : (
              <div className="w-full max-w-[500px] lg:w-[500px] aspect-square rounded-lg border border-[#222] overflow-hidden">
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center bg-[#111]">
                      <span className="text-gray-400 text-sm">loading 3D viewer...</span>
                    </div>
                  }
                >
                  <ThreePreview ref={threeRef} traits={traits} />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — trait selectors */}
        <div className="flex-1 min-w-0 order-3">
          {/* Category tabs — dynamically generated from collection's trait defs */}
          <div className="flex overflow-x-auto gap-1 pb-2 mb-3 scrollbar-thin">
            {traitDefs.map(def => {
              const isActive = activeTab === def.key
              const hasValue = traits[def.key] !== 'none' && traits[def.key] !== undefined
              const hasOptions = (layerOptions[def.key] || []).length > 0
              return (
                <button
                  key={def.key}
                  onClick={() => setActiveTab(def.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all border shrink-0
                    ${isActive
                      ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                      : hasValue
                        ? 'border-[#00ff41]/30 bg-[#111] text-[#00ff41]/70'
                        : 'border-[#222] bg-[#111] text-gray-500 hover:border-[#444] hover:text-white'
                    }
                    ${!hasOptions ? 'opacity-40' : ''}
                  `}
                >
                  {def.label}
                </button>
              )
            })}
          </div>

          {/* Current category label */}
          <div className="text-sm text-gray-400 mb-2">
            {traitDefs.find(d => d.key === activeTab)?.label}
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
                  {collection === '3d' ? (
                    <div className="w-full aspect-square rounded bg-[#111] flex items-center justify-center">
                      <span className={`text-xs text-center px-1 ${isSelected ? 'text-[#00ff41]' : 'text-gray-400'}`}>
                        {displayName(filename).replace(/_/g, ' ')}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded bg-[#111] overflow-hidden relative">
                      <img
                        src={thumbUrl(activeTab, filename)}
                        alt={displayName(filename)}
                        loading="lazy"
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'auto' }}
                      />
                    </div>
                  )}
                  <span className={`text-[10px] truncate w-full text-center ${isSelected ? 'text-[#00ff41]' : 'text-gray-500'}`}>
                    {displayName(filename).replace(/_/g, ' ')}
                  </span>
                </button>
              )
            })}
          </div>

          {(layerOptions[activeTab] || []).length === 0 && !loading && (
            <p className="text-xs text-yellow-500 mt-2">
              this trait category has no options in the {collectionInfo.name} collection
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
