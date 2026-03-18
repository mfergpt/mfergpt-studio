import { useState, useEffect } from 'react'
import { MFER_HEADS_URL, MFER_CLEAR_URL, MFER_3D_URL, MAX_MFER_ID } from '../lib/wagmi'

interface Props {
  id: number
  size?: number
  variant?: 'head' | 'clear'
  collection?: string
  className?: string
}

export default function MferPreview({ id, size = 200, variant = 'clear', collection, className = '' }: Props) {
  const [error, setError] = useState(false)
  useEffect(() => setError(false), [id, collection])
  const url = collection === '3d' ? MFER_3D_URL(id) : variant === 'head' ? MFER_HEADS_URL(id) : MFER_CLEAR_URL(id)

  if (error || id < 0 || id > MAX_MFER_ID) {
    return (
      <div
        className={`bg-[#1a1a1a] border border-[#333] rounded-lg flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-gray-500 text-sm">mfer #{id}</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={`mfer #${id}`}
      width={size}
      height={size}
      className={`rounded-lg bg-[#1a1a1a] ${className}`}
      onError={() => setError(true)}
    />
  )
}

export function RandomMferButton({ onSelect }: { onSelect: (id: number) => void }) {
  return (
    <button
      onClick={() => onSelect(Math.floor(Math.random() * (MAX_MFER_ID + 1)))}
      className="text-sm bg-[#222] hover:bg-[#333] text-[#00ff41] px-3 py-1.5 rounded border border-[#333] transition-colors"
    >
      🎲 random mfer
    </button>
  )
}
