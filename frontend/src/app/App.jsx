import { RouterProvider } from 'react-router-dom'
import { QueryProvider, ToastProvider } from './providers'
import { router } from './routes'

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <ToastProvider />
    </QueryProvider>
  )
}

export default App
