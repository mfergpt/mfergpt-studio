import { useState } from 'react'
import { THEMES, MAX_MFER_ID, COLLECTIONS } from '../lib/wagmi'
import { api } from '../lib/api'
import MferPreview, { RandomMferButton } from '../components/MferPreview'

const THEME_COLORS: Record<string, string> = {
  original: '#888', acid: '#39ff14', neon: '#ff00ff', gold: '#ffd700', frost: '#00bfff', ember: '#ff4500',
  cyberpunk: '#ff1493', hologram: '#7b68ee', diamond: '#b9f2ff', noir: '#555',
  sunset: '#ff6347', radioactive: '#7fff00', infrared: '#ff0000', xray: '#00ffff',
  vapor: '#ff77ff', chrome: '#c0c0c0', matrix_rain: '#00ff41', pixel: '#ff8800',
  glitch: '#ff0066', comic: '#ffcc00', pop: '#ff69b4', jungle: '#228b22',
  underwater: '#006994', thermal: '#ff4444', lego: '#ff0000', candy: '#ff69b4',
  graffiti: '#ff6600', tattoo: '#333', sketch: '#888', watercolor: '#4a90d9',
}

type OutputFormat = 'gif' | 'png' | 'mp4'

export default function ThemeRender() {
  const [mferId, setMferId] = useState(4566)
  const [selectedTheme, setSelectedTheme] = useState<string>('acid')
  const [collection, setCollection] = useState<string>('og')
  const [format, setFormat] = useState<OutputFormat>('gif')
  const [rendering, setRendering] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRender = async () => {
    setRendering(true)
    setError(null)
    setResult(null)
    try {
      const blob = await api.render(mferId, selectedTheme, format, collection)
      setResult(URL.createObjectURL(blob))
    } catch (e: any) {
      setError(e.message || 'render failed — is the backend running?')
    } finally {
      setRendering(false)
    }
  }

  const fileExt = format === 'gif' ? 'gif' : format === 'mp4' ? 'mp4' : 'png'
  const isVideo = format === 'mp4'

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">Theme Renderer</h1>
      <p className="text-gray-400 mb-8">pick a mfer. pick a theme. get art. free.</p>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Controls */}
        <div className="lg:w-80 shrink-0 space-y-6">
          {/* Mfer ID */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">mfer #</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={MAX_MFER_ID}
                value={mferId}
                onChange={e => setMferId(Math.min(MAX_MFER_ID, Math.max(0, parseInt(e.target.value) || 0)))}
                className="flex-1 bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#00ff41] outline-none"
              />
              <RandomMferButton onSelect={setMferId} />
            </div>
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            <MferPreview id={mferId} size={160} />
          </div>

          {/* Output format */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">output</label>
            <div className="flex gap-2">
              {([['gif', 'animated gif'], ['png', 'static png'], ['mp4', 'mp4 video']] as const).map(([val, label]) => (
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

          {/* Render button */}
          <button
            onClick={handleRender}
            disabled={rendering}
            className="w-full bg-[#00ff41] text-black font-bold py-3 rounded hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rendering ? 'rendering...' : `render ${selectedTheme}`}
          </button>
        </div>

        {/* Theme Grid */}
        <div className="flex-1">
          {/* Collection selector */}
          <div className="mb-6">
            <label className="text-sm text-gray-400 mb-1 block">collection</label>
            <p className="text-xs text-gray-600 mb-2">render any mfer in derivative styles</p>
            <div className="flex flex-wrap gap-2">
              {COLLECTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setCollection(c)}
                  className={`px-3 py-1.5 rounded text-xs transition-all border
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

          <label className="text-sm text-gray-400 mb-3 block">select theme ({THEMES.length})</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {THEMES.map(theme => (
              <button
                key={theme}
                onClick={() => setSelectedTheme(theme)}
                className={`relative p-3 rounded-lg border text-xs text-center transition-all
                  ${selectedTheme === theme
                    ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                    : 'border-[#222] bg-[#111] text-gray-400 hover:border-[#444] hover:text-white'
                  }`}
              >
                <div
                  className="w-full h-6 rounded mb-1.5 mx-auto"
                  style={{ background: THEME_COLORS[theme] || '#444' }}
                />
                <span>{theme.replace('_', ' ')}</span>
              </button>
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
              {isVideo ? (
                <video src={result} controls className="max-w-lg rounded-lg" />
              ) : (
                <img src={result} alt="rendered mfer" className="max-w-lg rounded-lg" />
              )}
              <a
                href={result}
                download={`mfer-${mferId}-${selectedTheme}.${fileExt}`}
                className="bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded text-sm transition-colors no-underline"
              >
                ⬇ download
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
