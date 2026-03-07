import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#2d3444',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
          border: '1px solid #eceef2',
        },
        success: {
          iconTheme: {
            primary: '#14b8aa',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  )
}
