import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../features/auth/AuthProvider'
import { signDocument, type SignDocumentResponse } from '../lib/workerApi'

export interface SignDocumentInput {
  documentId: string
  routeId: string
  assigneeRowId: string
  versionSha256: string
  password: string
  consent: boolean
  signatureMeaning: string
  typedSignature: string
}

export function useSignDocument() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<SignDocumentResponse, Error, SignDocumentInput>({
    mutationFn: async (input) => {
      if (!accessToken) throw new Error('Authentication is required.')
      return signDocument(input.documentId, {
        ...input,
        idempotencyKey: crypto.randomUUID(),
      }, accessToken)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['inbox-assignment'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      void queryClient.invalidateQueries({ queryKey: ['documents-list'] })
    },
  })
}
