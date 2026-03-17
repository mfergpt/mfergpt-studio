import { useState } from 'react'
import { MAX_MFER_ID } from '../lib/wagmi'
import { api } from '../lib/api'
import MferPreview from '../components/MferPreview'

export default function GmGn() {
  const [mode, setMode] = useState<'gm' | 'gn'>('gm')
  const [mferIds, setMferIds] = useState<number[]>([4566])
  const [duration, setDuration] = useState(15)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addMfer = () => {
    if (mferIds.length < 4) {
      setMferIds([...mferIds, Math.floor(Math.random() * (MAX_MFER_ID + 1))])
    }
  }

  const removeMfer = (index: number) => {
    if (mferIds.length > 1) {
      setMferIds(mferIds.filter((_, i) => i !== index))
    }
  }

  const updateMferId = (index: number, value: number) => {
    const updated = [...mferIds]
    updated[index] = Math.min(MAX_MFER_ID, Math.max(0, value))
    setMferIds(updated)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const blob = await api.gmgn(mferIds, mode, duration)
      setResult(URL.createObjectURL(blob))
    } catch (e: any) {
      setError(e.message || 'generation failed — is the backend running?')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">gm/gn videos</h1>
      <p className="text-gray-400 mb-8">3d turntable videos of your mfer. pick gm or gn vibes.</p>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Controls */}
        <div className="lg:w-96 shrink-0 space-y-6">
          {/* GM/GN Toggle */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">vibe</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('gm')}
                className={`flex-1 py-3 rounded-lg text-lg font-bold transition-all border
                  ${mode === 'gm'
                    ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                    : 'border-[#222] bg-[#111] text-gray-400 hover:border-[#444] hover:text-white'
                  }`}
              >
                ☀️ gm
              </button>
              <button
                onClick={() => setMode('gn')}
                className={`flex-1 py-3 rounded-lg text-lg font-bold transition-all border
                  ${mode === 'gn'
                    ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]'
                    : 'border-[#222] bg-[#111] text-gray-400 hover:border-[#444] hover:text-white'
                  }`}
              >
                🌙 gn
              </button>
            </div>
          </div>

          {/* Mfer IDs */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">mfers (1-4)</label>
            <div className="space-y-3">
              {mferIds.map((id, index) => (
                <div key={index} className="flex items-center gap-3">
                  <MferPreview id={id} size={48} />
                  <input
                    type="number"
                    min={0}
                    max={MAX_MFER_ID}
                    value={id}
                    onChange={e => updateMferId(index, parseInt(e.target.value) || 0)}
                    className="flex-1 bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#00ff41] outline-none"
                  />
                  {mferIds.length > 1 && (
                    <button
                      onClick={() => removeMfer(index)}
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded border border-[#333] hover:border-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {mferIds.length < 4 && (
              <button
                onClick={addMfer}
                className="mt-2 text-sm text-[#00ff41] hover:text-[#00cc33] transition-colors"
              >
                + add mfer
              </button>
            )}
          </div>

          {/* Duration Slider */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">duration: {duration}s</label>
            <input
              type="range"
              min={5}
              max={30}
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full accent-[#00ff41]"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>5s</span>
              <span>30s</span>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-[#00ff41] text-black font-bold py-3 rounded hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'generating...' : `generate ${mode} video`}
          </button>
        </div>

        {/* Result */}
        <div className="flex-1">
          {error && (
            <div className="bg-[#111] border border-red-500/30 rounded-xl p-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}
          {result && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-6 flex flex-col items-center gap-4">
              <video src={result} controls className="max-w-full rounded-lg" />
              <a
                href={result}
                download={`${mode}-mfer.mp4`}
                className="bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded text-sm transition-colors no-underline"
              >
                ⬇ download
              </a>
            </div>
          )}
          {!result && !error && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-12 flex items-center justify-center min-h-[300px]">
              <p className="text-gray-600 text-center">
                {mode === 'gm' ? '☀️' : '🌙'}<br />
                <span className="text-sm mt-2 block">your {mode} video will appear here</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
