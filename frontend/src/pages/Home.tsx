import { Link } from 'react-router-dom'
import { useTokenGate } from '../hooks/useTokenGate'
import { useState, useEffect } from 'react'
import { MFER_CLEAR_URL } from '../lib/wagmi'

const FEATURES = [
  { path: '/render', icon: '🎨', title: 'Theme Render', desc: '48 built-in themes. Pick a mfer, pick a style, get art.', free: true },
  { path: '/identify', icon: '🔍', title: 'Trait Identifier', desc: 'Upload any mfer image. We identify every trait.', free: true },
  { path: '/avatars', icon: '🧊', title: '3D Avatars', desc: 'Create your own 3D mfer avatar.', free: true },
  // Hidden until token-gated features ready:
  // { path: '/mferfy', icon: '🎧', title: 'Mferfy', desc: 'Turn any image into a mfer. Headphones + cigarette.', free: false },
  // { path: '/custom', icon: '✨', title: 'Custom Theme', desc: 'Describe any style. AI renders it.', free: false },
  // { path: '/scenes', icon: '🎬', title: '3D Scenes', desc: 'Generate animated 3D scenes with real mfer models.', free: false },
]

export default function Home() {
  const { isConnected, hasAccess, balanceUsd } = useTokenGate()
  const [heroMfer, setHeroMfer] = useState(4566)

  useEffect(() => {
    setHeroMfer(Math.floor(Math.random() * 10021))
  }, [])

  return (
    <div>
      {/* Hero */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
        <div className="flex-1">
          <h1 className="sartoshi-font text-5xl md:text-7xl text-[#00ff41] mb-4 leading-tight">
            mferGPT studio
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            create mfer content. no rules.
          </p>
          <p className="text-gray-500 mb-6">
            48 themes · trait identification · 3D avatars · more coming soon
          </p>
        </div>
        <div className="relative">
          <img
            src={MFER_CLEAR_URL(heroMfer)}
            alt="mfer"
            className="w-48 h-48 md:w-64 md:h-64 rounded-xl bg-[#111]"
          />
          <div className="absolute -bottom-2 -right-2 text-xs bg-[#111] border border-[#333] px-2 py-1 rounded text-gray-500">
            #{heroMfer}
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map(f => (
          <Link
            key={f.path}
            to={f.path}
            className="group bg-[#111] border border-[#222] rounded-xl p-6 hover:border-[#00ff41]/50 transition-all no-underline"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="sartoshi-font text-xl text-white group-hover:text-[#00ff41] transition-colors">
                {f.title}
              </h3>
              {f.free ? (
                <span className="text-[10px] bg-[#00ff41]/20 text-[#00ff41] px-1.5 py-0.5 rounded ml-auto">FREE</span>
              ) : (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded ml-auto">$5</span>
              )}
            </div>
            <p className="text-sm text-gray-400">{f.desc}</p>
          </Link>
        ))}
      </div>

      {/* Token Info — hidden until token-gated features ready
      <div className="mt-16 bg-[#111] border border-[#222] rounded-xl p-6 md:p-8">
        <h2 className="sartoshi-font text-2xl text-[#00ff41] mb-4">$MFERGPT</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-3">
              hold $5+ of $MFERGPT on Base to unlock all premium features: mferfy, custom themes, and 3D scenes.
            </p>
            <p className="text-gray-500 text-xs font-mono break-all">
              CA: 0x4160efdd66521483c22cb98b57b87d1fdafeab07
            </p>
          </div>
          <div className="flex items-center">
            <Link
              to="/swap"
              className="bg-[#00ff41] text-black font-bold px-6 py-3 rounded hover:bg-[#00cc33] transition-colors no-underline"
            >
              swap for $MFERGPT →
            </Link>
          </div>
        </div>
      </div>
      */}
    </div>
  )
}
