import { Link, Outlet, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useTokenGate } from '../hooks/useTokenGate'

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: '⌂' },
  { path: '/render', label: 'Theme Render', icon: '🎨', free: true },
  { path: '/identify', label: 'Identify', icon: '🔍', free: true },
  // { path: '/mferfy', label: 'Mferfy', icon: '🎧', free: false },
  // { path: '/custom', label: 'Custom Theme', icon: '✨', free: false },
  // { path: '/scenes', label: '3D Scenes', icon: '🎬', free: false },
  // { path: '/swap', label: 'Swap', icon: '💱' },
  { path: '/avatars', label: '3D Avatars', icon: '🧊' },
  { path: '/token', label: '$MFERGPT', icon: '💎' },
]

export default function Layout() {
  const location = useLocation()
  const { hasAccess, isConnected, balanceUsd } = useTokenGate()

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <nav className="w-full md:w-56 bg-[#111] border-b md:border-b-0 md:border-r border-[#222] flex md:flex-col shrink-0">
        <Link to="/" className="p-4 md:p-6 flex items-center gap-2 no-underline">
          <span className="sartoshi-font text-[#00ff41] text-2xl md:text-3xl">mferGPT</span>
          <span className="text-xs text-gray-500 mt-1">studio</span>
        </Link>

        <div className="flex md:flex-col overflow-x-auto md:overflow-visible flex-1">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm no-underline transition-colors whitespace-nowrap
                  ${active ? 'text-[#00ff41] bg-[#00ff41]/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                `}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.free === true && <span className="text-[10px] bg-[#00ff41]/20 text-[#00ff41] px-1.5 py-0.5 rounded ml-auto">FREE</span>}
                {item.free === false && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded ml-auto">$5</span>}
              </Link>
            )
          })}
        </div>

        {/* Wallet connect — hidden until token-gated features are ready
        <div className="hidden md:block p-4 border-t border-[#222]">
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          {isConnected && (
            <div className="mt-2 text-xs text-gray-500">
              ${balanceUsd.toFixed(2)} MFERGPT
              {hasAccess ? (
                <span className="text-[#00ff41] ml-1">✓</span>
              ) : (
                <span className="text-yellow-400 ml-1">need $5</span>
              )}
            </div>
          )}
        </div>
        */}
      </nav>

      {/* Mobile wallet button — hidden until token-gated features are ready
      <div className="md:hidden p-3 bg-[#111] border-b border-[#222] flex justify-end">
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
      </div>
      */}

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  )
}
