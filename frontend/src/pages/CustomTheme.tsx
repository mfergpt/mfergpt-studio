import { useState } from 'react'
import { MAX_MFER_ID } from '../lib/wagmi'
import { api } from '../lib/api'
import MferPreview, { RandomMferButton } from '../components/MferPreview'
import TokenGate from '../components/TokenGate'

export default function CustomTheme() {
  return (
    <TokenGate>
      <CustomThemeContent />
    </TokenGate>
  )
}

function CustomThemeContent() {
  const [mferId, setMferId] = useState(4566)
  const [prompt, setPrompt] = useState('')
  const [animated, setAnimated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRender = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const blob = await api.renderCustom(mferId, prompt, animated)
      setResult(URL.createObjectURL(blob))
    } catch (e: any) {
      setError(e.message || 'render failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">Custom Theme</h1>
      <p className="text-gray-400 mb-8">describe any style. AI renders your mfer in it.</p>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-96 space-y-4">
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

          <div className="flex justify-center">
            <MferPreview id={mferId} size={140} />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">theme description</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. underwater volcano with bioluminescent jellyfish and coral reefs, deep ocean lighting"
              className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#00ff41] outline-none resize-none h-28"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={animated}
              onChange={e => setAnimated(e.target.checked)}
              className="accent-[#00ff41] w-4 h-4"
            />
            <span className="text-sm text-gray-300">animated (MP4)</span>
          </label>

          <button
            onClick={handleRender}
            disabled={loading || !prompt.trim()}
            className="w-full bg-[#00ff41] text-black font-bold py-3 rounded hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'AI rendering...' : 'render custom theme ✨'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          {error && <p className="text-red-400">{error}</p>}
          {result ? (
            <div className="text-center">
              {animated ? (
                <video src={result} controls className="max-w-lg rounded-xl" />
              ) : (
                <img src={result} alt="custom render" className="max-w-lg rounded-xl shadow-2xl" />
              )}
              <a
                href={result}
                download={`mfer-${mferId}-custom.${animated ? 'mp4' : 'png'}`}
                className="inline-block mt-4 bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded text-sm transition-colors no-underline"
              >
                ⬇ download
              </a>
            </div>
          ) : (
            <div className="text-gray-600 text-center">
              <div className="text-6xl mb-3">✨</div>
              <p>describe a theme and we'll render it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
