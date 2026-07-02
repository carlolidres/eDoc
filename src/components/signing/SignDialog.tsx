import { useState, type FormEvent } from 'react'

export interface SignDialogValues {
  password: string
  consent: boolean
  signatureMeaning: string
  typedSignature: string
}

interface SignDialogProps {
  open: boolean
  defaultMeaning: string
  defaultTypedSignature: string
  isSubmitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (values: SignDialogValues) => Promise<void>
}

export function SignDialog({
  open,
  defaultMeaning,
  defaultTypedSignature,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
}: SignDialogProps) {
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [signatureMeaning, setSignatureMeaning] = useState(defaultMeaning)
  const [typedSignature, setTypedSignature] = useState(defaultTypedSignature)

  if (!open) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSubmit({ password, consent, signatureMeaning, typedSignature })
  }

  return (
    <div className="modal-scrim" role="presentation" onClick={onCancel}>
      <form
        className="modal-card"
        role="dialog"
        aria-labelledby="sign-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h2 id="sign-dialog-title">Confirm signature</h2>
        <p>Re-enter your password and confirm the meaning of your signature before applying it to this document.</p>

        <label>
          Signature meaning
          <input value={signatureMeaning} onChange={(event) => setSignatureMeaning(event.target.value)} required />
        </label>

        <label>
          Typed signature
          <input value={typedSignature} onChange={(event) => setTypedSignature(event.target.value)} required />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            required
          />
          <span>I agree that this electronic signature is legally binding for this assignment.</span>
        </label>

        {error ? <p className="form-error" role="alert">{error}</p> : null}

        <div className="button-row">
          <button className="button secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="button primary" type="submit" disabled={isSubmitting || !consent}>
            {isSubmitting ? 'Signing…' : 'Sign document'}
          </button>
        </div>
      </form>
    </div>
  )
}
