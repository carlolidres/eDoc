import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../features/auth/AuthProvider'
import { getFilePreviewUrl } from '../lib/workerApi'

export function useFilePreview(fileId: string | undefined) {
  const { accessToken } = useAuth()

  return useQuery({
    queryKey: ['file-preview', fileId],
    enabled: Boolean(fileId && accessToken),
    queryFn: async () => {
      if (!fileId || !accessToken) throw new Error('Preview is unavailable.')
      return getFilePreviewUrl(fileId, accessToken)
    },
    staleTime: 4 * 60_000,
  })
}
