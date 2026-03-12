import { useTokenGate } from '../hooks/useTokenGate'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Link } from 'react-router-dom'

export default function TokenGate({ children }: { children: React.ReactNode }) {
  const { isConnected, hasAccess, balanceUsd } = useTokenGate()

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="sartoshi-font text-3xl text-[#00ff41] mb-4">connect your wallet</h2>
        <p className="text-gray-400 mb-6 max-w-md">
          this feature requires holding $5+ of $MFERGPT on Base. connect your wallet to check.
        </p>
        <ConnectButton />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">💸</div>
        <h2 className="sartoshi-font text-3xl text-yellow-400 mb-4">need more $MFERGPT</h2>
        <p className="text-gray-400 mb-2">
          your balance: <span className="text-white">${balanceUsd.toFixed(2)}</span> — need <span className="text-[#00ff41]">$5.00</span>
        </p>
        <p className="text-gray-500 mb-6 text-sm">
          hold $5 of $MFERGPT on Base to unlock premium features
        </p>
        <Link
          to="/swap"
          className="bg-[#00ff41] text-black font-bold px-6 py-3 rounded hover:bg-[#00cc33] transition-colors no-underline"
        >
          swap for $MFERGPT →
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
