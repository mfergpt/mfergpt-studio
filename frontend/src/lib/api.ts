import { API_URL } from './wagmi'

class StudioAPI {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
  }

  private async request(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    const res = await fetch(`${API_URL}/api${path}`, { ...options, headers })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res
  }

  // Free endpoints
  async getThemes() {
    const res = await this.request('/themes')
    return res.json()
  }

  async render(mferId: number, theme: string, animated: boolean, collection?: string) {
    const body: Record<string, any> = { mferId, theme, animated }
    if (collection && collection !== 'og') body.collection = collection
    const res = await this.request('/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.blob()
  }

  async identify(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await this.request('/identify', { method: 'POST', body: form })
    return res.json()
  }

  async getMfer(id: number) {
    const res = await this.request(`/mfer/${id}`)
    return res.json()
  }

  // Token-gated endpoints
  async mferfy(file: File, customPrompt?: string) {
    const form = new FormData()
    form.append('file', file)
    if (customPrompt) form.append('customPrompt', customPrompt)
    const res = await this.request('/mferfy', { method: 'POST', body: form })
    return res.blob()
  }

  async mferfyUsername(username: string, customPrompt?: string) {
    const res = await this.request('/mferfy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, customPrompt }),
    })
    return res.blob()
  }

  async renderCustom(mferId: number, prompt: string, animated: boolean) {
    const res = await this.request('/render-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mferId, prompt, animated }),
    })
    return res.blob()
  }

  async createScene(prompt: string, mferIds?: number[], world?: string) {
    const res = await this.request('/scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mferIds, world }),
    })
    return res.json() as Promise<{ jobId: string }>
  }

  async getSceneStatus(jobId: string) {
    const res = await this.request(`/scene/${jobId}`)
    return res.json() as Promise<{ status: string; url?: string }>
  }

  async gmgn(mferIds: number[], mode: 'gm' | 'gn', duration: number): Promise<Blob> {
    const res = await this.request('/gmgn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mferIds, mode, duration }),
    })
    return res.blob()
  }

  // Auth
  async getNonce() {
    const res = await this.request('/auth/nonce')
    return res.json() as Promise<{ nonce: string }>
  }

  async verify(address: string, signature: string, message: string) {
    const res = await this.request('/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, message }),
    })
    const data = await res.json()
    if (data.token) this.setToken(data.token)
    return data
  }
}

export const api = new StudioAPI()
