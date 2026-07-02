import axios from 'axios'

// @ts-ignore
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Types
export interface SkillListItem {
  id: number
  name: string
  namespace: string
  slug: string
  description: string
  domain: string
  audience: string | null
  tags: string[]
  supported_agents: string[]
  version: string
  install_count: number
  rating: number | null
  is_featured: boolean
  author: { username: string; display_name: string | null; avatar_url: string | null; email: string }
  github_url: string | null
  updated_at: string
}

export interface SkillDetail extends SkillListItem {
  readme: string | null
  license: string
  github_url: string | null
  file_size_kb: number | null
  versions: { version: string; changelog: string | null; created_at: string }[]
  created_at: string
}

export interface SkillListResponse {
  items: SkillListItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface User {
  id: number
  username: string
  email: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  is_verified: boolean
  is_admin: boolean
  created_at: string
}

export interface GithubPrefetchResult {
  name: string
  description: string
  readme: string | null
  topics: string[]
  stars: number
  owner: string
  repo: string
  path: string | null
  github_url: string
}

export interface GithubImportPayload {
  github_url: string
  name: string
  namespace: string
  description: string
  domain: string
  audience?: string
  tags: string[]
  supported_agents: string[]
  version: string
  license: string
}

// API functions
export const skillsApi = {
  list: (params: Record<string, string | number | undefined>) =>
    api.get<SkillListResponse>('/skills', { params }),

  get: (namespace: string, name: string) =>
    api.get<SkillDetail>(`/skills/${namespace}/${name}`),

  publish: (formData: FormData) =>
    api.post<SkillDetail>('/skills', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (namespace: string, name: string, formData: FormData) =>
    api.patch<SkillDetail>(`/skills/${namespace}/${name}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (namespace: string, name: string) =>
    api.delete(`/skills/${namespace}/${name}`),

  rate: (namespace: string, name: string, score: number) => {
    const fd = new FormData()
    fd.append('score', String(score))
    return api.post<{ average: number; user_score: number }>(`/skills/${namespace}/${name}/rate`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getMyRating: (namespace: string, name: string) =>
    api.get<{ score: number | null }>(`/skills/${namespace}/${name}/my-rating`),

  domains: () => api.get<{ domain: string; count: number }[]>('/skills/domains/list'),

  prefetchGithub: (url: string) =>
    api.get<GithubPrefetchResult>('/skills/prefetch-github', { params: { url } }),

  importFromGithub: (payload: GithubImportPayload) =>
    api.post<SkillDetail>('/skills/import-github', payload),
}

// ── Plugin types ──────────────────────────────────────────────────────────────

export interface PluginListItem {
  id: number
  name: string
  namespace: string
  slug: string
  display_name: string
  description: string
  category: string
  platform: string
  tags: string[]
  version: string
  install_count: number
  rating: number | null
  github_url: string | null
  docs_url: string | null
  marketplace_name: string | null
  author: { username: string; display_name: string | null; avatar_url: string | null; email: string }
  updated_at: string
}

export interface PluginDetail extends PluginListItem {
  readme: string | null
  created_at: string
}

export interface PluginListResponse {
  items: PluginListItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface PluginCreatePayload {
  name: string
  namespace: string
  display_name: string
  description: string
  category: string
  platform: string
  tags: string[]
  version: string
  github_url?: string
  docs_url?: string
  readme?: string
  marketplace_name?: string
}

export const pluginsApi = {
  list: (params: Record<string, string | number | undefined>) =>
    api.get<PluginListResponse>('/plugins', { params }),

  get: (namespace: string, name: string) =>
    api.get<PluginDetail>(`/plugins/${namespace}/${name}`),

  create: (payload: PluginCreatePayload) =>
    api.post<PluginDetail>('/plugins', payload),

  update: (namespace: string, name: string, payload: Partial<PluginCreatePayload>) =>
    api.patch<PluginDetail>(`/plugins/${namespace}/${name}`, payload),

  delete: (namespace: string, name: string) =>
    api.delete(`/plugins/${namespace}/${name}`),

  rate: (namespace: string, name: string, score: number) => {
    const fd = new FormData()
    fd.append('score', String(score))
    return api.post<{ average: number; user_score: number }>(`/plugins/${namespace}/${name}/rate`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getMyRating: (namespace: string, name: string) =>
    api.get<{ score: number | null }>(`/plugins/${namespace}/${name}/my-rating`),
}

export const authApi = {
  register: (data: { username: string; email: string; password: string; display_name?: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  me: () => api.get<User>('/auth/me'),
}

export const adminApi = {
  status: () => api.get<{ has_admin: boolean }>('/admin/status'),
  listUsers: (q?: string) => api.get<User[]>('/admin/users', { params: q ? { q } : {} }),
  seed: (username: string) => api.post<User>('/admin/seed', { username }),
  promote: (username: string) => api.post<User>(`/admin/users/${username}/promote`),
  revoke: (username: string) => api.delete<User>(`/admin/users/${username}/revoke`),
  deleteUser: (username: string) => api.delete(`/admin/users/${username}`),
}
