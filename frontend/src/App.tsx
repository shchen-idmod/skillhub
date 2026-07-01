import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/Navbar'
import { RegistryPage } from './pages/RegistryPage'
import { SkillDetailPage } from './pages/SkillDetailPage'
import { PublishPage } from './pages/PublishPage'
import { EditSkillPage } from './pages/EditSkillPage'
import { PluginsPage } from './pages/PluginsPage'
import { PluginDetailPage } from './pages/PluginDetailPage'
import { PublishPluginPage } from './pages/PublishPluginPage'
import { EditPluginPage } from './pages/EditPluginPage'
import { DocsPage } from './pages/DocsPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { AdminPage } from './pages/AdminPage'
import { useAuthStore } from './hooks/useAuth'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function AppRoutes() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => { init() }, [init])
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<RegistryPage />} />
        <Route path="/skills/:namespace/:name" element={<SkillDetailPage />} />
        <Route path="/skills/:namespace/:name/edit" element={<EditSkillPage />} />
        <Route path="/plugins" element={<PluginsPage />} />
        <Route path="/plugins/:namespace/:name/edit" element={<EditPluginPage />} />
        <Route path="/plugins/:namespace/:name" element={<PluginDetailPage />} />
        <Route path="/publish-plugin" element={<PublishPluginPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
