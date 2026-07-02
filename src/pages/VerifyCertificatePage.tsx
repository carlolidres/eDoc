import { FormEvent, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { env } from '../lib/env'
import { isVerificationCodeFormatValid, normalizeVerificationCode } from '../utils/verificationCode'

type VerificationParticipant = {
  display_name: string
  email: string
  action: string
  completed_at: string | null
}

type VerificationResult = {
  valid: boolean
  certificateId: string
  issuedAt?: string
  documentTitle?: string
  referenceNumber?: string | null
  documentHash?: string | null
  signedFileHash?: string | null
  participants?: VerificationParticipant[]
}

export function VerifyCertificatePage() {
  const { certificateId } = useParams()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!certificateId) return

    const normalized = normalizeVerificationCode(code)
    if (!isVerificationCodeFormatValid(normalized)) {
      setError('Enter the verification code from the completion certificate.')
      return
    }

    if (!env.workerApiUrl) {
      setError('Worker API URL is not configured.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(
        `${env.workerApiUrl}/api/verification/${certificateId}?code=${encodeURIComponent(normalized)}`,
      )
      const body = (await response.json()) as VerificationResult & {
        error?: { message: string }
      }
      if (!response.ok) {
        throw new Error(body.error?.message ?? 'Verification request failed.')
      }
      setResult(body)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Verification failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!certificateId) {
    return (
      <div className="auth-page">
        <EmptyState title="Certificate not found" description="A certificate id is required to verify authenticity." />
      </div>
    )
  }

  return (
    <div className="auth-page">
      <section className="auth-card verify-card">
        <span className="eyebrow">Public verification</span>
        <h2>Verify completion certificate</h2>
        <p>Enter the certificate id and verification code to confirm authenticity without signing in.</p>

        <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Certificate ID
            <input value={certificateId} readOnly />
          </label>
          <label>
            Verification code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              required
            />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying…' : 'Verify certificate'}
          </button>
        </form>

        {result ? (
          <div className={`verify-result ${result.valid ? 'valid' : 'invalid'}`} role="status">
            {result.valid ? (
              <>
                <h3>Certificate verified</h3>
                <p><strong>Document:</strong> {result.documentTitle}</p>
                {result.referenceNumber ? <p><strong>Reference:</strong> {result.referenceNumber}</p> : null}
                <p><strong>Issued:</strong> {result.issuedAt ? new Date(result.issuedAt).toLocaleString() : 'unknown'}</p>
                <p><strong>Original hash:</strong> {result.documentHash ?? 'unavailable'}</p>
                <p><strong>Signed PDF hash:</strong> {result.signedFileHash ?? 'n/a'}</p>
                {result.participants?.length ? (
                  <div className="verify-participants">
                    <h4>Participants</h4>
                    <ul>
                      {result.participants.map((participant, index) => (
                        <li key={`${participant.email}-${index}`}>
                          {participant.display_name} — {participant.action}
                          {participant.completed_at
                            ? ` · ${new Date(participant.completed_at).toLocaleString()}`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <h3>Verification failed</h3>
                <p>The certificate id and verification code do not match a valid completion certificate.</p>
              </>
            )}
          </div>
        ) : null}

        <p className="verify-footer">
          <Link to="/login">Sign in to eDoc</Link>
        </p>
      </section>
    </div>
  )
}
