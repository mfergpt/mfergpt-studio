import { useState, useEffect } from 'react'
import { MFER_CLEAR_URL } from '../lib/wagmi'

export default function Avatars() {
  const [mfers, setMfers] = useState<number[]>([])

  useEffect(() => {
    const ids = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10021))
    setMfers(ids)
  }, [])

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">3D Avatars</h1>
      <p className="text-gray-400 mb-8">create your own 3D mfer avatar. fully customizable.</p>

      {/* Hero Card */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h2 className="sartoshi-font text-3xl text-white mb-4">mfer avatars playground</h2>
            <p className="text-gray-400 mb-4">
              build, customize, and export 3D mfer avatars. pick traits, change colors,
              pose your mfer, and download as GLB/FBX/VRM for use anywhere — games, VR, metaverse, PFPs.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              powered by the same 10,021 mfer models used in mferGPT's 3D scenes.
            </p>
            <a
              href="https://playground.mferavatars.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#00ff41] text-black font-bold px-8 py-3 rounded hover:bg-[#00cc33] transition-colors no-underline text-lg"
            >
              open playground ↗
            </a>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {mfers.map((id, i) => (
              <img
                key={i}
                src={MFER_CLEAR_URL(id)}
                alt={`mfer #${id}`}
                className="w-20 h-20 rounded-lg bg-[#0a0a0a]"
              />
            ))}
          </div>
        </div>
      </div>

      {/* AR Link */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <div className="flex items-center gap-4">
          <span className="text-3xl">📱</span>
          <div>
            <h3 className="sartoshi-font text-xl text-white mb-1">AR mode</h3>
            <p className="text-gray-400 text-sm">view mfer avatars in augmented reality on your phone</p>
          </div>
          <a
            href="https://ar.mferavatars.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded text-sm transition-colors no-underline"
          >
            open AR ↗
          </a>
        </div>
      </div>
    </div>
  )
}
