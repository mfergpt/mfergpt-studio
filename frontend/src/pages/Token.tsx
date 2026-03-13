const CLANKER_URL = 'https://clanker.world/clanker/0x4160efdd66521483c22cb98b57b87d1fdafeab07'
const DEXSCREENER_URL = 'https://dexscreener.com/base/0x23ce6e13e06fc19bb5b5948334019fc75b7d0773eddf21a72008ac0ab8753d61'
const UNISWAP_URL = 'https://app.uniswap.org/swap?chain=base&outputCurrency=0x4160efdd66521483c22cb98b57b87d1fdafeab07'
const CA = '0x4160efdd66521483c22cb98b57b87d1fdafeab07'

export default function Token() {
  return (
    <div>
      <h1 className="sartoshi-font text-4xl text-[#00ff41] mb-2">$mfergpt</h1>
      <p className="text-gray-400 mb-8">the token powering mferGPT. on Base.</p>

      {/* Token Info */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6 md:p-8 mb-6">
        <div className="space-y-4">
          <div className="flex justify-between text-sm border-b border-[#222] pb-3">
            <span className="text-gray-400">chain</span>
            <span className="text-white">Base</span>
          </div>
          <div className="flex justify-between text-sm border-b border-[#222] pb-3">
            <span className="text-gray-400">contract</span>
            <span className="text-white text-xs font-mono break-all select-all">{CA}</span>
          </div>
          <div className="flex justify-between text-sm border-b border-[#222] pb-3">
            <span className="text-gray-400">launched via</span>
            <span className="text-white">bankr</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <a
          href={CLANKER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#00ff41] text-black font-bold py-4 rounded-xl text-center hover:bg-[#00cc33] transition-colors no-underline"
        >
          swap on clanker ↗
        </a>
        <a
          href={UNISWAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#222] hover:bg-[#333] text-white font-bold py-4 rounded-xl text-center transition-colors no-underline border border-[#333]"
        >
          swap on uniswap ↗
        </a>
        <a
          href={DEXSCREENER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#222] hover:bg-[#333] text-white font-bold py-4 rounded-xl text-center transition-colors no-underline border border-[#333]"
        >
          chart ↗
        </a>
      </div>

      {/* DexScreener embed */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <iframe
          src="https://dexscreener.com/base/0x23ce6e13e06fc19bb5b5948334019fc75b7d0773eddf21a72008ac0ab8753d61?embed=1&theme=dark"
          title="DexScreener Chart"
          className="w-full border-0"
          style={{ height: '500px' }}
        />
      </div>
    </div>
  )
}
