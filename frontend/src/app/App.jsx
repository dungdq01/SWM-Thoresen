import { RouterProvider } from 'react-router-dom'
import { QueryProvider, ToastProvider } from './providers'
import { router } from './routes'
import { LanguageProvider } from '@shared/i18n'
import { AuthProvider } from '@domains/auth'

function App() {
  return (
    <LanguageProvider>
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <ToastProvider />
        </AuthProvider>
      </QueryProvider>
    </LanguageProvider>
  )
}

export default App
