import App from './App.jsx'
import { Toaster } from 'sonner'
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap'
import { ThemeSync } from '@/components/ThemeSync'
import { ChatProvider } from '@/providers/ChatProvider'

export function Root() {
  useAuthBootstrap()
  return (
    <>
      <ThemeSync />
      <ChatProvider>
        <App />
      </ChatProvider>
      <Toaster richColors position="top-center" />
    </>
  )
}
