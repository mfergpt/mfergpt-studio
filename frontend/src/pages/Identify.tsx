import { useState, useRef } from 'react'
import { api } from '../lib/api'

export default function Identify() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, [string, number][]> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
  }

  const handleIdentify = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.identify(file)
      setResult(data)
    } catch (e: any) {
      setError(e.message || 'identification failed — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">Trait Identifier</h1>
      <p className="text-gray-400 mb-8">upload any mfer image. we identify every trait. free.</p>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Upload Area */}
        <div className="md:w-96 space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            className="border-2 border-dashed border-[#333] hover:border-[#00ff41]/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
          >
            {preview ? (
              <img src={preview} alt="uploaded" className="max-w-full max-h-64 mx-auto rounded-lg" />
            ) : (
              <div className="py-8">
                <div className="text-4xl mb-3">📷</div>
                <p className="text-gray-400">drop an image or click to upload</p>
                <p className="text-gray-600 text-xs mt-2">PNG, JPG, GIF, WEBP</p>
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

          <button
            onClick={handleIdentify}
            disabled={!file || loading}
            className="w-full bg-[#00ff41] text-black font-bold py-3 rounded hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'identifying...' : 'identify traits'}
          </button>
        </div>

        {/* Results */}
        <div className="flex-1">
          {error && <p className="text-red-400">{error}</p>}
          {result && (
            <div className="bg-[#111] border border-[#222] rounded-xl p-6">
              <h3 className="sartoshi-font text-xl text-[#00ff41] mb-4">traits detected</h3>
              <div className="space-y-3">
                {Object.entries(result).map(([trait, matches]) => (
                  <div key={trait} className="border-b border-[#222] pb-3">
                    <div className="text-sm text-gray-400 mb-1">{trait}</div>
                    {Array.isArray(matches) ? matches.map(([value, confidence], i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-white text-sm">{value}</span>
                        <span className="text-xs text-gray-500">{(confidence * 100).toFixed(1)}%</span>
                      </div>
                    )) : (
                      <span className="text-white text-sm">{String(matches)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
