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
export const MFER_3D_URL = (id: number) => `https://cybermfers.sfo3.digitaloceanspaces.com/cybermfers/private/assets/png/${id}.png`
export const MAX_MFER_ID = 10020

export const API_URL = import.meta.env.VITE_API_URL || 'https://studio.mfergpt.lol'

export const THEMES = [
  'original',
  'acid','ascii','banksy','candy','chalk','chrome','circuit','clay',
  'collage','comic','cross_stitch','cyberpunk','diamond','duotone','ember',
  'frost','glitch','gold','graffiti','hand_drawn','hologram','infrared',
  'jungle','lego','matrix_rain','mosaic','negative','neon','newspaper',
  'noir','oil_paint','pixel','pop','radioactive','retro_tv','risograph',
  'sketch','stained_glass','sumi_e','sunset','tattoo','thermal','traced',
  'underwater','vapor','watercolor','woodcut','xray',
  // Custom themes (AI-generated, saved from previous renders)
  'custom_infrared_thermal_heat_signature','custom_kintsugi_the_japanese_art_of_repairing_b',
  'custom_volcanic_magma','custom_volcanic_obsidian_with_magma_cracks',
  'custom_deep_ocean_bioluminescence','custom_deep_ocean_bioluminescence_glowing_neon',
  'custom_starry_night_van_gogh_style_swirling_blu','custom_starry_night_with_vibrant_northern_light',
  'custom_ancient_egyptian_hieroglyphic_gold','custom_cathedral_stained_glass_ethereal_light',
  'custom_medieval_gothic_biblical_oil_painting_st','custom_simpsons_cartoon_style_yellow_skin_sprin',
  'custom_taco','custom_mfer_drenched_in_thick_black_crude_oil_d',
] as const

export type Theme = typeof THEMES[number]

export const COLLECTIONS = [
  'og', '3d', 'creyzies', 'eos', 'fineart', 'mfersahead',
  'mfersbehind', 'sketchy', 'extended', 'mpher', 'somfers', 'mfpurrs', 'tinydinos'
] as const

// Collections available for theme rendering (no 3d — needs full composed image)
export const THEME_COLLECTIONS = COLLECTIONS.filter(c => c !== '3d')

export type Collection = typeof COLLECTIONS[number]
