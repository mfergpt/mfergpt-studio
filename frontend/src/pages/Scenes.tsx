import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import TokenGate from '../components/TokenGate'

const WORLDS = [
  'auto','alley','arena','bar','countryside','dawn','industrial','moon',
  'night-street','office','party','podcast','rooftop','snowy','stage',
  'studio-pro','sunset-beach','trading-floor','void','wasteland'
]

export default function Scenes() {
  return (
    <TokenGate>
      <ScenesContent />
    </TokenGate>
  )
}

function ScenesContent() {
  const [prompt, setPrompt] = useState('')
  const [mferIds, setMferIds] = useState('')
  const [world, setWorld] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const handleCreate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setStatus(null)
    try {
      const ids = mferIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      const data = await api.createScene(prompt, ids.length ? ids : undefined, world === 'auto' ? undefined : world)
      setJobId(data.jobId)
      setStatus('queued')
      setLoading(false)

      // Poll for result
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.getSceneStatus(data.jobId)
          setStatus(s.status)
          if (s.status === 'done' && s.url) {
            setResult(s.url)
            clearInterval(pollRef.current)
          }
        } catch {
          // keep polling
        }
      }, 5000)
    } catch (e: any) {
      setError(e.message || 'scene creation failed')
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">3D Scenes</h1>
      <p className="text-gray-400 mb-8">describe a scene. real mfer models. animated with TTS. takes 2-10 min.</p>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-[28rem] space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">scene prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. two mfers arguing about whether ETH or SOL is better at a bar. one is drunk."
              className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#00ff41] outline-none resize-none h-32"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">mfer IDs (optional, comma-separated)</label>
            <input
              type="text"
              value={mferIds}
              onChange={e => setMferIds(e.target.value)}
              placeholder="e.g. 4566, 2000, 8827"
              className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#00ff41] outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">world</label>
            <div className="grid grid-cols-4 gap-1.5">
              {WORLDS.map(w => (
                <button
                  key={w}
                  onClick={() => setWorld(w)}
                  className={`text-xs py-1.5 px-2 rounded transition-colors
                    ${world === w
                      ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/50'
                      : 'bg-[#111] border border-[#222] text-gray-400 hover:text-white hover:border-[#444]'
                    }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !!jobId || !prompt.trim()}
            className="w-full bg-[#00ff41] text-black font-bold py-3 rounded hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'submitting...' : jobId ? `${status}...` : 'generate scene 🎬'}
          </button>

          {status && !result && (
            <div className="text-center text-sm text-gray-400">
              <div className="animate-pulse">⏳ {status}... this takes 2-10 minutes</div>
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center">
          {error && <p className="text-red-400">{error}</p>}
          {result ? (
            <div className="text-center">
              <video src={result} controls className="max-w-full rounded-xl shadow-2xl" />
              <a
                href={result}
                download="mfer-scene.mp4"
                className="inline-block mt-4 bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded text-sm transition-colors no-underline"
              >
                ⬇ download
              </a>
            </div>
          ) : (
            <div className="text-gray-600 text-center">
              <div className="text-6xl mb-3">🎬</div>
              <p>your 3D scene will appear here</p>
              <p className="text-xs mt-2">19 worlds · 2,367 animations · TTS voices</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
