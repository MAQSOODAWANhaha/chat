import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { MainLayout } from '@/components/layout/MainLayout'
import Home from '@/pages/Home'
import AudioVideoCall from '@/pages/AudioVideoCall'
import Settings from '@/pages/Settings'
import TestConnection from '@/pages/TestConnection'
import { useAppStore } from '@/stores/useAppStore'

function App() {
  const { theme } = useAppStore()

  return (
    <div className={`min-h-screen bg-background text-foreground ${theme}`}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="call" element={<AudioVideoCall />} />
          <Route path="settings" element={<Settings />} />
          <Route path="test" element={<TestConnection />} />
        </Route>
      </Routes>
      <Toaster />
    </div>
  )
}

export default App