import { useTokenGate } from '../hooks/useTokenGate'

const UNISWAP_URL = 'https://app.uniswap.org/swap?chain=base&outputCurrency=0x4160efdd66521483c22cb98b57b87d1fdafeab07'
const DEXSCREENER_URL = 'https://dexscreener.com/base/0x4160efdd66521483c22cb98b57b87d1fdafeab07'

export default function Swap() {
  const { isConnected, balance, balanceUsd, tokenPrice, hasAccess } = useTokenGate()

  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">Swap</h1>
      <p className="text-gray-400 mb-8">get $MFERGPT on Base to unlock all premium features.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Token Info */}
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-6">
            <h3 className="sartoshi-font text-xl text-white mb-4">$MFERGPT</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">price</span>
                <span className="text-white">${tokenPrice > 0 ? tokenPrice.toFixed(8) : '...'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">chain</span>
                <span className="text-white">Base</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">contract</span>
                <span className="text-white text-xs font-mono">0x4160...ab07</span>
              </div>
              {isConnected && (
                <>
                  <hr className="border-[#222]" />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">your balance</span>
                    <span className="text-white">{balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">value</span>
                    <span className={hasAccess ? 'text-[#00ff41]' : 'text-yellow-400'}>${balanceUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">premium access</span>
                    <span className={hasAccess ? 'text-[#00ff41]' : 'text-yellow-400'}>
                      {hasAccess ? '✓ unlocked' : `need $5 (have $${balanceUsd.toFixed(2)})`}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href={UNISWAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#00ff41] text-black font-bold py-3 rounded text-center hover:bg-[#00cc33] transition-colors no-underline text-sm"
            >
              swap on Uniswap ↗
            </a>
            <a
              href={DEXSCREENER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#222] hover:bg-[#333] text-white px-4 py-3 rounded transition-colors no-underline text-sm"
            >
              chart ↗
            </a>
          </div>
        </div>

        {/* Uniswap Embed */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <iframe
            src={UNISWAP_URL}
            title="Uniswap Swap"
            className="w-full border-0"
            style={{ height: '560px' }}
            allow="clipboard-write"
          />
        </div>
      </div>

      {/* CA */}
      <div className="mt-8 bg-[#111] border border-[#222] rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">full contract address (Base)</p>
        <p className="font-mono text-sm text-gray-300 break-all select-all">
          0x4160efdd66521483c22cb98b57b87d1fdafeab07
        </p>
      </div>
    </div>
  )
}
