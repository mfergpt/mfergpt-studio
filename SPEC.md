# mferGPT Studio — Spec

## Overview
A web app where anyone can create mfer-themed content. Free features require no wallet. Premium features (anything requiring OpenAI/LLM API calls) require connecting a wallet holding $5+ of $MFERGPT on Base.

## Architecture
- **Frontend:** React + Vite + TypeScript, deployed to GitHub Pages (studio.mfergpt.lol)
- **Backend API:** FastAPI (Python), runs on Mac mini, exposed via subdomain (api-studio.mfergpt.lol or similar)
- **Wallet:** wagmi v2 + RainbowKit for wallet connection (Base chain)
- **Token Gate:** Read $MFERGPT balance onchain. Contract: `0x4160efdd66521483c22cb98b57b87d1fdafeab07` (Base, ERC-20). $5 threshold calculated from onchain price or use Dexscreener API.
- **Swap Widget:** Embedded Uniswap widget so users can buy $MFERGPT directly on the site.

## Design
- **Dark theme** — black/dark gray background, mfer green (#00ff41) and white accents
- **Font:** SartoshiScript-Regular.otf for headings/branding (fallback: monospace). Located at `/Users/mfergpt/.openclaw/workspace/builds/mfer-scenes/fonts/SartoshiScript-Regular.otf`
- **Mfer artwork:** Use mfer images from the collection. Heads from `https://heads.mfers.dev/{id}.png`, clear (no bg) from `https://clear.mfers.dev/{id}.png` (id: 0-10020)
- **3D models preview:** Link to playground.mferavatars.xyz prominently
- **Vibe:** minimal, punk, anti-corporate. Like a mfer built it.

## Pages / Features

### 1. Home / Landing
- Hero with mfer art, tagline "create mfer content. no rules."
- Feature grid showing what you can do
- Wallet connect button (RainbowKit)
- If wallet connected, show $MFERGPT balance and tier status

### 2. Theme Renderer (FREE)
- Pick any mfer by ID (0-10020) or enter a number
- Preview the mfer (from heads.mfers.dev or clear.mfers.dev)
- Select from 48 built-in themes (show visual preview/thumbnails for each)
- Toggle: static PNG or animated MP4
- Hit "Render" → calls backend API → returns image/video
- Download button
- **No wallet required**

### 3. Trait Identifier (FREE)
- Upload any mfer image
- Backend identifies traits (type, background, headphones, hat, eyes, mouth, etc.)
- Shows closest matching mfer ID from collection
- **No wallet required**

### 4. Mferfy (TOKEN-GATED — $5 MFERGPT)
- Upload any image OR enter a Twitter/X username to fetch their PFP
- Adds mfer headphones + cigarette
- Optional: custom additions (text prompt for what else to add)
- Returns mferfied image
- **Requires $5+ MFERGPT**

### 5. Custom Theme Render (TOKEN-GATED — $5 MFERGPT)
- Pick a mfer by ID
- Enter freetext theme description (e.g. "underwater volcano with bioluminescent jellyfish")
- AI generates custom themed render
- **Requires $5+ MFERGPT**

### 6. 3D Scene Generator (TOKEN-GATED — $5 MFERGPT)
- Text prompt describing a scene
- Optional: pick specific mfer IDs for characters
- Select world (19 options) or "auto"
- Generates 3D animated MP4 with TTS
- **Requires $5+ MFERGPT**

### 7. Swap Widget
- Embedded Uniswap widget for buying $MFERGPT on Base
- Shows current price, market cap
- "You need $5 of $MFERGPT to unlock premium features — swap here"

### 8. 3D Avatars Link
- Prominent card/section linking to playground.mferavatars.xyz
- "Create your own 3D mfer avatar"
- Maybe embed in iframe or just link out

## Backend API Endpoints

All endpoints at the API base URL.

### Free Endpoints
```
POST /render
  body: { mferId: number, theme: string, animated: boolean }
  returns: { url: string } or binary image/video

POST /identify
  body: multipart form with image file
  returns: { traits: {...}, closestMatch: { id: number, score: number } }

GET /themes
  returns: [{ name: string, preview: string }]

GET /mfer/{id}
  returns: { id, traits, headUrl, clearUrl }
```

### Token-Gated Endpoints
All require header: `X-Wallet-Address: 0x...` + `X-Wallet-Signature: ...` (sign a message to prove ownership, server verifies onchain balance)

```
POST /mferfy
  body: multipart form with image OR { username: string }
  optional: { customPrompt: string }
  returns: image

POST /render-custom
  body: { mferId: number, prompt: string, animated: boolean }
  returns: image/video

POST /scene
  body: { prompt: string, mferIds?: number[], world?: string }
  returns: { jobId: string } (async, poll for result)

GET /scene/{jobId}
  returns: { status: "pending"|"rendering"|"done", url?: string }
```

### Auth Flow
1. Frontend: user connects wallet via RainbowKit
2. Frontend: requests a nonce from backend (`GET /auth/nonce`)
3. Frontend: user signs message with wallet (EIP-712 or personal_sign)
4. Frontend: sends signature to backend (`POST /auth/verify`)
5. Backend: recovers address from signature, checks $MFERGPT balance on Base via RPC
6. Backend: returns JWT or session token
7. Frontend: includes token in subsequent requests

## Token Balance Check
- Use Base RPC (public or Alchemy/Infura)
- Call `balanceOf(address)` on MFERGPT contract
- Get token price from DexScreener API: `https://api.dexscreener.com/latest/dex/tokens/0x4160efdd66521483c22cb98b57b87d1fdafeab07`
- Calculate: balance * price >= $5

## Tech Stack
- **Frontend:** React 18, Vite, TypeScript, wagmi v2, RainbowKit, TailwindCSS
- **Backend:** FastAPI, Python 3.11+, uvicorn
- **Renders:** Calls existing scripts in `/Users/mfergpt/.openclaw/workspace/scripts/`
  - Theme render: `python3 -m mfer_gen --id {id} --theme {theme} [--animated] -o /tmp/output.png`
  - Identify: `python3 -m mfer_gen.identify /tmp/input.png --all --top 3`
  - Mferfy: OpenAI edits API (see TOOLS.md)
  - Scenes: `bash /Users/mfergpt/.openclaw/workspace/builds/mfer-scenes/scripts/make-scene.sh`
- **Watermark:** All outputs watermarked via `python3 /Users/mfergpt/.openclaw/workspace/scripts/watermark.py`

## File Structure
```
mfergpt-studio/
├── frontend/          # React + Vite app
│   ├── public/
│   │   └── fonts/     # SartoshiScript-Regular.otf
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/     # useTokenGate, useMferBalance, etc.
│   │   ├── lib/       # wagmi config, api client
│   │   └── App.tsx
│   ├── index.html
│   └── vite.config.ts
├── backend/           # FastAPI server
│   ├── main.py
│   ├── auth.py
│   ├── routes/
│   │   ├── render.py
│   │   ├── identify.py
│   │   ├── mferfy.py
│   │   └── scene.py
│   ├── token_gate.py
│   └── requirements.txt
└── README.md
```

## Important References
- Mfer render script: `/Users/mfergpt/.openclaw/workspace/scripts/mfer_gen/`
- Scene pipeline: `/Users/mfergpt/.openclaw/workspace/builds/mfer-scenes/scripts/`
- Watermark script: `/Users/mfergpt/.openclaw/workspace/scripts/watermark.py`
- SartoshiScript font: `/Users/mfergpt/.openclaw/workspace/builds/mfer-scenes/fonts/SartoshiScript-Regular.otf`
- x-get-pfp.sh: `/Users/mfergpt/.openclaw/workspace/scripts/x-get-pfp.sh`
- Mfer metadata: `/Users/mfergpt/.openclaw/workspace/data/mfers-metadata.json`
- MFERGPT token CA: `0x4160efdd66521483c22cb98b57b87d1fdafeab07` (Base)
- MFER token CA: `0xE3086852A4B125803C815a158249ae468A3254Ca` (Base)

## Notes
- All generated content gets watermarked with "mfergpt" signature
- Scene generation is async (takes 2-10 min) — use job queue with polling
- Keep it punk. No corporate UI. Mfer energy throughout.
- Mobile responsive but desktop-first
