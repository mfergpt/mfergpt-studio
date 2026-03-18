import { useState } from 'react'
import { COLLECTIONS } from '../lib/wagmi'
import { api } from '../lib/api'

const TRAIT_OPTIONS: Record<string, string[]> = {
  background: ['none', 'blue', 'red', 'green', 'yellow', 'orange', 'purple', 'tree', 'space', 'graveyard'],
  type: ['none', 'plain mfer', 'charcoal mfer', 'ape mfer', 'alien mfer', 'zombie mfer'],
  eyes: ['none', 'regular eyes', 'shades', '3d glasses', 'nerd glasses', 'vr', 'eye patch', 'eye mask', 'purple shades'],
  mouth: ['none', 'flat', 'smile'],
  headphones: ['none', 'black', 'red', 'blue', 'green', 'pink', 'gold', 'white', 'lined', 'orange', 'purple'],
  hat_over: ['none', 'cowboy hat', 'top hat', 'pilot helmet', 'hoodie red', 'hoodie blue', 'hoodie green', 'hoodie yellow', 'hoodie orange', 'hoodie purple', 'hoodie black', 'hoodie white'],
  hat_under: ['none', 'bandana red', 'bandana blue', 'bandana green', 'beanie red', 'beanie blue', 'beanie black', 'cap red', 'cap blue', 'cap black', 'cap forward red', 'cap forward blue', 'cap forward black', 'headband red', 'headband blue', 'headband green', 'knit red', 'knit blue', 'knit black', 'mesa hat'],
  short_hair: ['none', 'messy black', 'messy brown', 'messy blonde', 'messy red', 'mohawk black', 'mohawk brown', 'mohawk blonde', 'mohawk red', 'mohawk green', 'mohawk purple', 'mohawk pink'],
  long_hair: ['none', 'long hair black', 'long hair yellow'],
  shirt: ['none', 'collared shirt white', 'collared shirt blue', 'collared shirt red', 'collared shirt green', 'hoodie down red', 'hoodie down blue', 'hoodie down green', 'hoodie down black', 'hoodie down orange', 'hoodie down purple'],
  chain: ['none', 'gold chain', 'silver chain'],
  watch: ['none', 'argo', 'oyster', 'sub aqua', 'sub black', 'sub green', 'sub blue'],
  beard: ['none', 'full beard', 'shadow beard'],
  smoke: ['none', 'cig black', 'cig white', 'pipe'],
}

const CATEGORIES = [
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

interface SavedMfer {
  id: string
  name: string
  traits: Record<string, string>
  collection: string
  createdAt: string
}

const STORAGE_KEY = 'mfergpt-saved-mfers'
const MAX_SAVED = 50

function getDefaultTraits(): Record<string, string> {
  const traits: Record<string, string> = {}
  for (const key of Object.keys(TRAIT_OPTIONS)) {
    traits[key] = 'none'
  }
  return traits
}

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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomTraits(): Record<string, string> {
  const traits = getDefaultTraits()

  for (const key of Object.keys(TRAIT_OPTIONS)) {
    const options = TRAIT_OPTIONS[key]
    if (key === 'type' || key === 'background') {
      traits[key] = pick(options.filter(o => o !== 'none'))
    } else {
      traits[key] = Math.random() < 0.4 ? 'none' : pick(options.filter(o => o !== 'none'))
    }
  }

  // 1. hat_over vs hat_under: randomly remove one (hoodie+bandana OK, hoodie+beanie NOT)
  if (traits.hat_over !== 'none' && traits.hat_under !== 'none') {
    const isHoodie = traits.hat_over.startsWith('hoodie')
    const isBandana = traits.hat_under.startsWith('bandana')
    if (!(isHoodie && isBandana)) {
      if (Math.random() < 0.5) traits.hat_over = 'none'
      else traits.hat_under = 'none'
    }
  }

  // 2. short_hair vs long_hair: remove one randomly
  if (traits.short_hair !== 'none' && traits.long_hair !== 'none') {
    if (Math.random() < 0.5) traits.short_hair = 'none'
    else traits.long_hair = 'none'
  }

  // 3. ape: no long hair
  if (traits.type === 'ape mfer') {
    traits.long_hair = 'none'
  }

  // 4. shirt/hoodie vs chain: conflict
  if (traits.shirt !== 'none' && traits.chain !== 'none') {
    if (Math.random() < 0.5) traits.shirt = 'none'
    else traits.chain = 'none'
  }

  // 5. shirt vs hoodie up: conflict
  if (traits.shirt !== 'none' && traits.hat_over !== 'none' && traits.hat_over.startsWith('hoodie')) {
    if (Math.random() < 0.5) traits.shirt = 'none'
    else traits.hat_over = 'none'
  }

  // 6. mohawk/messy vs non-hoodie headwear: conflict
  const hasHair = traits.short_hair !== 'none'
  const hasNonHoodieHat = (traits.hat_over !== 'none' && !traits.hat_over.startsWith('hoodie')) || traits.hat_under !== 'none'
  if (hasHair && hasNonHoodieHat) {
    if (Math.random() < 0.5) {
      traits.short_hair = 'none'
    } else {
      if (traits.hat_over !== 'none' && !traits.hat_over.startsWith('hoodie')) traits.hat_over = 'none'
      if (traits.hat_under !== 'none') traits.hat_under = 'none'
    }
  }

  // 7. top hat/pilot/cowboy removes all hair
  if (['top hat', 'pilot helmet', 'cowboy hat'].includes(traits.hat_over)) {
    traits.short_hair = 'none'
    traits.long_hair = 'none'
  }

  // 8. hoodie up removes all hair
  if (traits.hat_over !== 'none' && traits.hat_over.startsWith('hoodie')) {
    traits.short_hair = 'none'
    traits.long_hair = 'none'
  }

  return traits
}

type OutputFormat = 'gif' | 'png'

export default function MferCreator() {
  const [traits, setTraits] = useState<Record<string, string>>(getDefaultTraits())
  const [collection, setCollection] = useState<string>('og')
  const [format, setFormat] = useState<OutputFormat>('gif')
  const [rendering, setRendering] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedMfer[]>(loadSaved())
  const [saveName, setSaveName] = useState('')
  const [showSaved, setShowSaved] = useState(false)

  const setTrait = (category: string, value: string) => {
    setTraits(prev => ({ ...prev, [category]: value }))
  }

  const handleRandom = () => {
    setTraits(randomTraits())
  }

  const handleClear = () => {
    setTraits(getDefaultTraits())
    setResult(null)
    setError(null)
  }

  const handleRender = async () => {
    setRendering(true)
    setError(null)
    setResult(null)
    try {
      const blob = await api.renderTraits(traits, collection, format)
      setResult(URL.createObjectURL(blob))
    } catch (e: any) {
      setError(e.message || 'render failed')
    } finally {
      setRendering(false)
    }
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
    setResult(null)
    setError(null)
  }

  const handleDelete = (id: string) => {
    const updated = saved.filter(m => m.id !== id)
    setSaved(updated)
    persistSaved(updated)
  }

  const activeTraitCount = Object.values(traits).filter(v => v !== 'none').length

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">Mfer Creator</h1>
      <p className="text-gray-400 mb-8">pick traits. build your mfer. free.</p>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Controls */}
        <div className="lg:w-80 shrink-0 space-y-6">
          {/* Collection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">collection</label>
            <div className="flex flex-wrap gap-1.5">
              {COLLECTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setCollection(c)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all border
                    ${collection === c
                      ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                      : 'border-[#222] bg-[#111] text-gray-400 hover:border-[#444] hover:text-white'
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
              className="flex-1 bg-[#222] hover:bg-[#333] text-white py-2.5 rounded text-sm font-medium transition-colors border border-[#333]"
            >
              random
            </button>
            <button
              onClick={handleClear}
              className="flex-1 bg-[#222] hover:bg-[#333] text-white py-2.5 rounded text-sm font-medium transition-colors border border-[#333]"
            >
              clear
            </button>
          </div>

          {/* Format */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">output</label>
            <div className="flex gap-2">
              {([['gif', 'animated gif'], ['png', 'static png']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFormat(val)}
                  className={`flex-1 py-2 rounded text-xs font-medium transition-all border
                    ${format === val
                      ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                      : 'border-[#222] bg-[#111] text-gray-400 hover:border-[#444] hover:text-white'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Trait count */}
          <div className="text-xs text-gray-500">
            {activeTraitCount} trait{activeTraitCount !== 1 ? 's' : ''} selected
          </div>

          {/* Render */}
          <button
            onClick={handleRender}
            disabled={rendering || activeTraitCount === 0}
            className="w-full bg-[#00ff41] text-black font-bold py-3 rounded hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rendering ? 'rendering...' : 'render mfer'}
          </button>

          {/* Save */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="name this mfer..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              maxLength={30}
              className="flex-1 bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#00ff41] outline-none"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-30 border border-[#333]"
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
              {showSaved ? '\u25be' : '\u25b8'} saved mfers ({saved.length})
            </button>
          )}

          {showSaved && saved.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {saved.map(m => (
                <div key={m.id} className="bg-[#111] border border-[#222] rounded p-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{m.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {m.collection} &middot; {Object.values(m.traits).filter(v => v !== 'none').length} traits
                    </div>
                  </div>
                  <button onClick={() => handleLoad(m)} className="text-[10px] text-[#00ff41] hover:underline shrink-0">
                    load
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="text-[10px] text-red-400 hover:underline shrink-0">
                    del
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trait Grid */}
        <div className="flex-1">
          <div className="space-y-5">
            {CATEGORIES.map(cat => (
              <div key={cat.key}>
                <label className="text-sm text-gray-400 mb-2 block">
                  {cat.label}
                  {traits[cat.key] !== 'none' && (
                    <span className="text-[#00ff41] ml-2">&middot; {traits[cat.key]}</span>
                  )}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TRAIT_OPTIONS[cat.key].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTrait(cat.key, opt)}
                      className={`px-2.5 py-1.5 rounded text-xs transition-all border
                        ${traits[cat.key] === opt
                          ? opt === 'none'
                            ? 'border-[#444] bg-[#222] text-gray-300'
                            : 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                          : 'border-[#222] bg-[#111] text-gray-400 hover:border-[#444] hover:text-white'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {(result || error) && (
        <div className="mt-8 bg-[#111] border border-[#222] rounded-xl p-6">
          {error ? (
            <p className="text-red-400">{error}</p>
          ) : result && (
            <div className="flex flex-col items-center gap-4">
              <img src={result} alt="created mfer" className="max-w-lg rounded-lg" />
              <a
                href={result}
                download={`mfer-custom.${format === 'gif' ? 'gif' : 'png'}`}
                className="bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded text-sm transition-colors no-underline"
              >
                download
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
