import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

import { config } from './lib/wagmi'
import Layout from './components/Layout'
import Home from './pages/Home'
import ThemeRender from './pages/ThemeRender'
import Identify from './pages/Identify'
import Mferfy from './pages/Mferfy'
import CustomTheme from './pages/CustomTheme'
import Scenes from './pages/Scenes'
import Swap from './pages/Swap'
import Avatars from './pages/Avatars'
import Token from './pages/Token'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#00ff41',
            accentColorForeground: 'black',
            borderRadius: 'medium',
            overlayBlur: 'small',
          })}
        >
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/render" element={<ThemeRender />} />
                <Route path="/identify" element={<Identify />} />
                <Route path="/avatars" element={<Avatars />} />
                <Route path="/token" element={<Token />} />
                {/* Hidden until token-gated features ready:
                <Route path="/mferfy" element={<Mferfy />} />
                <Route path="/custom" element={<CustomTheme />} />
                <Route path="/scenes" element={<Scenes />} />
                <Route path="/swap" element={<Swap />} />
                */}
              </Route>
            </Routes>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
