import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './app/App'
import { AuthProvider } from './features/auth/AuthProvider'
import { ThemeProvider } from './hooks/useTheme'
import './styles/globals.css'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const message = typeof query.meta?.errorMessage === 'string' ? query.meta.errorMessage : 'GraphQL query failed.'
      console.error(message, error.message)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      meta: {
        errorMessage: 'GraphQL query failed.',
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HashRouter>
  </React.StrictMode>,
)
