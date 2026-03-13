import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { base } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'mferGPT Studio',
  projectId: 'mfergpt-studio', // replace with real WalletConnect project ID
  chains: [base],
})

export const MFERGPT_TOKEN = '0x4160efdd66521483c22cb98b57b87d1fdafeab07' as const
export const MFERGPT_DECIMALS = 18
export const TOKEN_GATE_USD = 5

export const MFER_HEADS_URL = (id: number) => `https://heads.mfers.dev/${id}.png`
export const MFER_CLEAR_URL = (id: number) => `https://clear.mfers.dev/${id}.png`
export const MAX_MFER_ID = 10020

export const API_URL = import.meta.env.VITE_API_URL || ''

export const THEMES = [
  'acid','ascii_art','banksy','candy','chalk','chrome','circuit','clay',
  'collage','comic','cross_stitch','cyberpunk','diamond','duotone','ember',
  'frost','glitch','gold','graffiti','hand_drawn','hologram','infrared',
  'jungle','lego','matrix_rain','mosaic','negative','neon','newspaper',
  'noir','oil_paint','pixel','pop','radioactive','retro_tv','risograph',
  'sketch','stained_glass','sumi_e','sunset','tattoo','thermal','traced',
  'underwater','vapor','watercolor','woodcut','xray'
] as const

export type Theme = typeof THEMES[number]
