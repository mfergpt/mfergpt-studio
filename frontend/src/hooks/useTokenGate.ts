import { useAccount, useReadContract } from 'wagmi'
import { useState, useEffect } from 'react'
import { MFERGPT_TOKEN, MFERGPT_DECIMALS, TOKEN_GATE_USD } from '../lib/wagmi'
import { formatUnits } from 'viem'

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export function useTokenGate() {
  const { address, isConnected } = useAccount()
  const [tokenPrice, setTokenPrice] = useState<number>(0)

  const { data: rawBalance } = useReadContract({
    address: MFERGPT_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  useEffect(() => {
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${MFERGPT_TOKEN}`)
      .then(r => r.json())
      .then(data => {
        const pair = data.pairs?.[0]
        if (pair?.priceUsd) setTokenPrice(parseFloat(pair.priceUsd))
      })
      .catch(() => {})
  }, [])

  const balance = rawBalance ? parseFloat(formatUnits(rawBalance, MFERGPT_DECIMALS)) : 0
  const balanceUsd = balance * tokenPrice
  const hasAccess = balanceUsd >= TOKEN_GATE_USD

  return {
    isConnected,
    address,
    balance,
    balanceUsd,
    tokenPrice,
    hasAccess,
    requiredUsd: TOKEN_GATE_USD,
  }
}
