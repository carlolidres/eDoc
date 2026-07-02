import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { hasuraAdminRequest } from './hasura'

type HasuraEnv = {
  HASURA_GRAPHQL_URL: string
  HASURA_ADMIN_SECRET: string
}

type ParticipantRow = {
  display_name: string
  email: string
  action: string
  completed_at: string | null
}

type CompletionContext = {
  document: {
    id: string
    title: string
    reference_number: string | null
    status: string
    organization_id: string
  }
  route: {
    id: string
    status: string
    version_id: string
    completed_at: string | null
  }
  version: {
    original_sha256: string | null
  } | null
  signed_file: { sha256: string | null } | null
  participants: ParticipantRow[]
  existing_certificate: {
    id: string
    certificate_key: string
    verification_code: string
    issued_at: string
  } | null
}

export function normalizeVerificationCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function generateVerificationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')
}

function buildCertificateObjectKey(input: {
  organizationId: string
  documentId: string
  certificateId: string
}) {
  return `organizations/${input.organizationId}/documents/${input.documentId}/certificates/${input.certificateId}.pdf`
}

async function sha256Hex(buffer: ArrayBuffer | Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function loadCompletionContext(env: HasuraEnv, documentId: string, routeId: string): Promise<CompletionContext> {
  const data = await hasuraAdminRequest<{
    documents_by_pk: CompletionContext['document'] | null
    document_routes_by_pk: {
      id: string
      status: string
      version_id: string
      completed_at: string | null
      route_steps: Array<{
        route_step_actions: Array<{
          action: string
          created_at: string
          assignee: { assignee: { display_name: string; email: string } | null } | null
        }>
      }>
    } | null
    completion_certificates: Array<{
      id: string
      certificate_key: string
      verification_code: string
      issued_at: string
    }>
  }>(
    env,
    `query CompletionContext($documentId: uuid!, $routeId: uuid!) {
      documents_by_pk(id: $documentId) {
        id
        title
        reference_number
        status
        organization_id
      }
      document_routes_by_pk(id: $routeId) {
        id
        status
        version_id
        completed_at
        route_steps(order_by: { sequence: asc }) {
          route_step_actions(order_by: { created_at: asc }) {
            action
            created_at
            assignee {
              assignee { display_name email }
            }
          }
        }
      }
      completion_certificates(where: { route_id: { _eq: $routeId } }, limit: 1) {
        id
        certificate_key
        verification_code
        issued_at
      }
    }`,
    { documentId, routeId },
  )

  const route = data.document_routes_by_pk
  if (!route) throw new Error('Route was not found.')

  const versionData = await hasuraAdminRequest<{
    document_versions_by_pk: { original_sha256: string | null } | null
    document_files: Array<{ sha256: string | null }>
  }>(
    env,
    `query VersionHashes($versionId: uuid!, $documentId: uuid!) {
      document_versions_by_pk(id: $versionId) {
        original_sha256
      }
      document_files(
        where: { document_id: { _eq: $documentId }, file_role: { _eq: "signed" } }
        order_by: { created_at: desc }
        limit: 1
      ) {
        sha256
      }
    }`,
    { versionId: route.version_id, documentId },
  )

  const participants: ParticipantRow[] = []
  for (const step of route.route_steps) {
    for (const action of step.route_step_actions) {
      const profile = action.assignee?.assignee
      if (!profile) continue
      participants.push({
        display_name: profile.display_name,
        email: profile.email,
        action: action.action,
        completed_at: action.created_at,
      })
    }
  }

  const document = data.documents_by_pk
  if (!document) throw new Error('Document was not found.')

  return {
    document,
    route,
    version: versionData.document_versions_by_pk,
    signed_file: versionData.document_files[0] ?? null,
    participants,
    existing_certificate: data.completion_certificates[0] ?? null,
  }
}

async function buildCertificatePdf(input: {
  documentTitle: string
  referenceNumber: string | null
  certificateId: string
  verificationCode: string
  issuedAt: string
  documentHash: string | null
  signedFileHash: string | null
  participants: ParticipantRow[]
}) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let y = 740

  const draw = (text: string, size = 11, useBold = false) => {
    page.drawText(text, { x: 48, y, size, font: useBold ? bold : font, color: rgb(0.1, 0.15, 0.2) })
    y -= size + 8
  }

  draw('Completion Certificate', 20, true)
  draw(`Document: ${input.documentTitle}`, 12, true)
  if (input.referenceNumber) draw(`Reference: ${input.referenceNumber}`)
  draw(`Certificate ID: ${input.certificateId}`)
  draw(`Verification code: ${input.verificationCode}`)
  draw(`Issued: ${new Date(input.issuedAt).toISOString()}`)
  y -= 6
  draw('Document integrity', 12, true)
  draw(`Original SHA-256: ${input.documentHash ?? 'unavailable'}`)
  draw(`Signed PDF SHA-256: ${input.signedFileHash ?? 'n/a'}`)
  y -= 6
  draw('Participants', 12, true)
  if (!input.participants.length) {
    draw('No recorded participant actions.')
  } else {
    for (const participant of input.participants) {
      const when = participant.completed_at ? new Date(participant.completed_at).toISOString() : 'pending'
      draw(
        `${participant.display_name} (${participant.email}) — ${participant.action} — ${when}`,
        10,
      )
    }
  }

  return pdf.save()
}

export interface IssueCertificateInput {
  documentId: string
  routeId: string
  userId: string
  requestId: string
}

export interface IssueCertificateResult {
  certificateId: string
  certificateFileId: string
  verificationCode: string
  certificateKey: string
  issuedAt: string
  idempotent: boolean
}

export async function issueCompletionCertificate(
  env: HasuraEnv,
  bucket: R2Bucket,
  input: IssueCertificateInput,
): Promise<IssueCertificateResult> {
  const context = await loadCompletionContext(env, input.documentId, input.routeId)

  if (context.existing_certificate) {
    const existing = context.existing_certificate
    const fileData = await hasuraAdminRequest<{
      document_files: Array<{ id: string }>
    }>(
      env,
      `query CertificateFile($objectKey: String!) {
        document_files(where: { r2_object_key: { _eq: $objectKey } }, limit: 1) {
          id
        }
      }`,
      { objectKey: existing.certificate_key },
    )

    return {
      certificateId: existing.id,
      certificateFileId: fileData.document_files[0]?.id ?? existing.id,
      verificationCode: existing.verification_code,
      certificateKey: existing.certificate_key,
      issuedAt: existing.issued_at,
      idempotent: true,
    }
  }

  if (context.route.status !== 'completed' || context.document.status !== 'completed') {
    throw new Error('Completion certificate can only be issued for completed routes.')
  }

  const certificateId = crypto.randomUUID()
  const certificateFileId = crypto.randomUUID()
  const verificationCode = generateVerificationCode()
  const certificateKey = buildCertificateObjectKey({
    organizationId: context.document.organization_id,
    documentId: context.document.id,
    certificateId,
  })
  const issuedAt = context.route.completed_at ?? new Date().toISOString()

  const pdfBytes = await buildCertificatePdf({
    documentTitle: context.document.title,
    referenceNumber: context.document.reference_number,
    certificateId,
    verificationCode,
    issuedAt,
    documentHash: context.version?.original_sha256 ?? null,
    signedFileHash: context.signed_file?.sha256 ?? null,
    participants: context.participants,
  })

  await bucket.put(certificateKey, pdfBytes, {
    httpMetadata: { contentType: 'application/pdf' },
  })

  const pdfHash = await sha256Hex(pdfBytes)

  await hasuraAdminRequest(
    env,
    `mutation IssueCertificate(
      $certificate: completion_certificates_insert_input!
      $file: document_files_insert_input!
      $audit: audit_events_insert_input!
    ) {
      insert_completion_certificates_one(object: $certificate) {
        id
      }
      insert_document_files_one(object: $file) {
        id
      }
      insert_audit_events_one(object: $audit) {
        id
      }
    }`,
    {
      certificate: {
        id: certificateId,
        organization_id: context.document.organization_id,
        document_id: context.document.id,
        version_id: context.route.version_id,
        route_id: input.routeId,
        certificate_key: certificateKey,
        verification_code: verificationCode,
        issued_at: issuedAt,
      },
      file: {
        id: certificateFileId,
        organization_id: context.document.organization_id,
        document_id: context.document.id,
        version_id: context.route.version_id,
        file_role: 'certificate',
        file_name: `completion-certificate-${certificateId}.pdf`,
        mime_type: 'application/pdf',
        size_bytes: pdfBytes.byteLength,
        r2_object_key: certificateKey,
        sha256: pdfHash,
      },
      audit: {
        organization_id: context.document.organization_id,
        user_id: input.userId,
        event_type: 'certificate.issued',
        entity_type: 'completion_certificate',
        entity_id: certificateId,
        document_id: context.document.id,
        version_id: context.route.version_id,
        new_value: {
          certificateId,
          verificationCode,
          routeId: input.routeId,
        },
        request_id: input.requestId,
        source: 'worker',
      },
    },
  )

  return {
    certificateId,
    certificateFileId,
    verificationCode,
    certificateKey,
    issuedAt,
    idempotent: false,
  }
}

export interface VerifyCertificateResult {
  valid: boolean
  certificateId: string
  issuedAt?: string
  documentTitle?: string
  referenceNumber?: string | null
  documentHash?: string | null
  signedFileHash?: string | null
  participants?: ParticipantRow[]
}

export async function verifyCertificate(
  env: HasuraEnv,
  certificateId: string,
  verificationCode: string,
): Promise<VerifyCertificateResult> {
  const normalized = normalizeVerificationCode(verificationCode)
  if (!normalized) {
    return { valid: false, certificateId }
  }

  const data = await hasuraAdminRequest<{
    completion_certificates: Array<{
      id: string
      verification_code: string
      issued_at: string
      version_id: string
      document: { title: string; reference_number: string | null } | null
      route_id: string
      document_id: string
    }>
  }>(
    env,
    `query VerifyCertificate($certificateId: uuid!) {
      completion_certificates(where: { id: { _eq: $certificateId } }, limit: 1) {
        id
        verification_code
        issued_at
        version_id
        route_id
        document_id
        document { title reference_number }
      }
    }`,
    { certificateId },
  )

  const certificate = data.completion_certificates[0]
  if (!certificate || normalizeVerificationCode(certificate.verification_code) !== normalized) {
    return { valid: false, certificateId }
  }

  const evidence = await hasuraAdminRequest<{
    document_versions_by_pk: { original_sha256: string | null } | null
    document_files: Array<{ sha256: string | null }>
    document_routes_by_pk: {
      route_steps: Array<{
        route_step_actions: Array<{
          action: string
          created_at: string
          assignee: { assignee: { display_name: string; email: string } | null } | null
        }>
      }>
    } | null
  }>(
    env,
    `query CertificateEvidence($documentId: uuid!, $routeId: uuid!, $versionId: uuid!) {
      document_versions_by_pk(id: $versionId) {
        original_sha256
      }
      document_files(
        where: { document_id: { _eq: $documentId }, file_role: { _eq: "signed" } }
        order_by: { created_at: desc }
        limit: 1
      ) {
        sha256
      }
      document_routes_by_pk(id: $routeId) {
        route_steps(order_by: { sequence: asc }) {
          route_step_actions(order_by: { created_at: asc }) {
            action
            created_at
            assignee {
              assignee { display_name email }
            }
          }
        }
      }
    }`,
    {
      documentId: certificate.document_id,
      routeId: certificate.route_id,
      versionId: certificate.version_id,
    },
  )

  const participants: ParticipantRow[] = []
  for (const step of evidence.document_routes_by_pk?.route_steps ?? []) {
    for (const action of step.route_step_actions) {
      const profile = action.assignee?.assignee
      if (!profile) continue
      participants.push({
        display_name: profile.display_name,
        email: profile.email,
        action: action.action,
        completed_at: action.created_at,
      })
    }
  }

  return {
    valid: true,
    certificateId: certificate.id,
    issuedAt: certificate.issued_at,
    documentTitle: certificate.document?.title,
    referenceNumber: certificate.document?.reference_number,
    documentHash: evidence.document_versions_by_pk?.original_sha256 ?? null,
    signedFileHash: evidence.document_files[0]?.sha256 ?? null,
    participants,
  }
}
