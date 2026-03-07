import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

export const queryKeys = {
  auth: {
    me: ['auth', 'me'],
    permissions: ['auth', 'me', 'permissions'],
  },
  roles: {
    all: ['foundation', 'roles'],
    list: (filters) => ['foundation', 'roles', 'list', filters],
    detail: (id) => ['foundation', 'roles', 'detail', id],
  },
  permissions: {
    all: ['foundation', 'permissions'],
    list: (filters) => ['foundation', 'permissions', 'list', filters],
  },
  reasonCodes: {
    all: ['foundation', 'reason-codes'],
    list: (filters) => ['foundation', 'reason-codes', 'list', filters],
    detail: (id) => ['foundation', 'reason-codes', 'detail', id],
  },
  numberSequences: {
    all: ['foundation', 'number-sequences'],
    list: (filters) => ['foundation', 'number-sequences', 'list', filters],
    detail: (id) => ['foundation', 'number-sequences', 'detail', id],
  },
  governance: {
    rules: {
      all: ['foundation', 'rules'],
      list: (filters) => ['foundation', 'rules', 'list', filters],
      detail: (id) => ['foundation', 'rules', 'detail', id],
    },
    decisionLogs: {
      all: ['foundation', 'decision-logs'],
      list: (filters) => ['foundation', 'decision-logs', 'list', filters],
    },
  },
  logs: {
    audit: {
      all: ['foundation', 'audit-logs'],
      list: (filters) => ['foundation', 'audit-logs', 'list', filters],
    },
    exception: {
      all: ['foundation', 'exception-logs'],
      list: (filters) => ['foundation', 'exception-logs', 'list', filters],
    },
  },
}
