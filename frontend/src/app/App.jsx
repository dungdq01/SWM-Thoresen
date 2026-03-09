import { RouterProvider } from 'react-router-dom'
import { QueryProvider, ToastProvider } from './providers'
import { router } from './routes'
import { LanguageProvider } from '@shared/i18n'

function App() {
  return (
    <LanguageProvider>
      <QueryProvider>
        <RouterProvider router={router} />
        <ToastProvider />
      </QueryProvider>
    </LanguageProvider>
  )
}

export default App
