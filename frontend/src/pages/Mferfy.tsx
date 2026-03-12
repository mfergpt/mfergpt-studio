import { useState, useRef } from 'react'
import { api } from '../lib/api'
import TokenGate from '../components/TokenGate'

export default function Mferfy() {
  return (
    <TokenGate>
      <MferfyContent />
    </TokenGate>
  )
}

function MferfyContent() {
  const [mode, setMode] = useState<'upload' | 'username'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  const handleMferfy = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      let blob: Blob
      if (mode === 'upload' && file) {
        blob = await api.mferfy(file, customPrompt || undefined)
      } else if (mode === 'username' && username) {
        blob = await api.mferfyUsername(username, customPrompt || undefined)
      } else return
      setResult(URL.createObjectURL(blob))
    } catch (e: any) {
      setError(e.message || 'mferfy failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">Mferfy</h1>
      <p className="text-gray-400 mb-8">turn any image into a mfer. headphones + cigarette. instant.</p>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-96 space-y-4">
          {/* Mode Toggle */}
          <div className="flex bg-[#111] rounded-lg p-1 border border-[#222]">
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 py-2 text-sm rounded ${mode === 'upload' ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'text-gray-400'}`}
            >
              upload image
            </button>
            <button
              onClick={() => setMode('username')}
              className={`flex-1 py-2 text-sm rounded ${mode === 'username' ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'text-gray-400'}`}
            >
              X/Twitter PFP
            </button>
          </div>

          {mode === 'upload' ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault() }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              className="border-2 border-dashed border-[#333] hover:border-[#00ff41]/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
            >
              {preview ? (
                <img src={preview} alt="input" className="max-w-full max-h-48 mx-auto rounded-lg" />
              ) : (
                <div className="py-4">
                  <div className="text-4xl mb-3">🖼️</div>
                  <p className="text-gray-400">drop an image or click to upload</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          ) : (
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.replace('@', ''))}
              placeholder="twitter username (without @)"
              className="w-full bg-[#111] border border-[#333] rounded px-3 py-3 text-white text-sm focus:border-[#00ff41] outline-none"
            />
          )}

          {/* Custom additions */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">custom additions (optional)</label>
            <input
              type="text"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="e.g. add sprite can and cheetos"
              className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#00ff41] outline-none"
            />
          </div>

          <button
            onClick={handleMferfy}
            disabled={loading || (mode === 'upload' ? !file : !username)}
            className="w-full bg-[#00ff41] text-black font-bold py-3 rounded hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'mferfying...' : 'mferfy it 🎧'}
          </button>
        </div>

        {/* Result */}
        <div className="flex-1 flex items-center justify-center">
          {error && <p className="text-red-400">{error}</p>}
          {result ? (
            <div className="text-center">
              <img src={result} alt="mferfied" className="max-w-lg rounded-xl shadow-2xl" />
              <a
                href={result}
                download="mferfied.png"
                className="inline-block mt-4 bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded text-sm transition-colors no-underline"
              >
                ⬇ download
              </a>
            </div>
          ) : (
            <div className="text-gray-600 text-center">
              <div className="text-6xl mb-3">🎧</div>
              <p>result appears here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
