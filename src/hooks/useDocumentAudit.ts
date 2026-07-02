import { useGraphQLQuery } from './useGraphQLQuery'
import {
  DOCUMENT_AUDIT_EVENTS,
  DOCUMENT_CERTIFICATE,
  RECENT_AUDIT_EVENTS,
  type DocumentAuditEventsResponse,
  type DocumentCertificateResponse,
  type RecentAuditEventsResponse,
} from '../graphql/queries'

export function useDocumentAuditTrail(documentId?: string) {
  const query = useGraphQLQuery<DocumentAuditEventsResponse>(
    documentId ? `document-audit-${documentId}` : 'document-audit',
    DOCUMENT_AUDIT_EVENTS,
    { documentId: documentId ?? '' },
    { enabled: Boolean(documentId) },
  )

  return {
    events: query.data?.audit_events ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

export function useRecentAuditEvents() {
  const query = useGraphQLQuery<RecentAuditEventsResponse>('recent-audit-events', RECENT_AUDIT_EVENTS)

  return {
    events: query.data?.audit_events ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

export function useDocumentCertificate(documentId?: string) {
  const query = useGraphQLQuery<DocumentCertificateResponse>(
    documentId ? `document-certificate-${documentId}` : 'document-certificate',
    DOCUMENT_CERTIFICATE,
    { documentId: documentId ?? '' },
    { enabled: Boolean(documentId) },
  )

  return {
    certificate: query.data?.completion_certificates[0] ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
