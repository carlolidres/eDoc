import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import * as pdfjs from 'pdfjs-dist'
import {
  fieldTypesForAction,
  signatureFieldTypeLabel,
  type RouteAction,
  type SignatureFieldType,
} from '../../types/domain'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface FieldAssigneeOption {
  id: string
  label: string
  action: RouteAction
}

export interface SignatureFieldDraft {
  localId: string
  assigneeRowId: string
  assigneeLabel: string
  fieldType: SignatureFieldType
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
}

interface FieldPlacementViewerProps {
  url: string
  accessToken: string
  assigneeOptions: FieldAssigneeOption[]
  fields: SignatureFieldDraft[]
  onAddField: (field: SignatureFieldDraft) => void
  onRemoveField: (localId: string) => void
}

const MIN_FIELD_FRACTION = 0.015

export function FieldPlacementViewer({
  url,
  accessToken,
  assigneeOptions,
  fields,
  onAddField,
  onRemoveField,
}: FieldPlacementViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(assigneeOptions[0]?.id ?? '')
  const [selectedFieldType, setSelectedFieldType] = useState<SignatureFieldType>(
    fieldTypesForAction(assigneeOptions[0]?.action ?? 'review')[0],
  )
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)

  const selectedAssignee = assigneeOptions.find((option) => option.id === selectedAssigneeId) ?? null
  const availableFieldTypes = useMemo(
    () => fieldTypesForAction(selectedAssignee?.action ?? 'review'),
    [selectedAssignee],
  )

  useEffect(() => {
    if (!availableFieldTypes.includes(selectedFieldType)) {
      setSelectedFieldType(availableFieldTypes[0])
    }
  }, [availableFieldTypes, selectedFieldType])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    const task = pdfjs.getDocument({
      url,
      httpHeaders: { Authorization: `Bearer ${accessToken}` },
    })

    task.promise
      .then((doc) => {
        if (!cancelled) {
          setPdf(doc)
          setPageNumber(1)
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message || 'Could not load PDF.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      void task.destroy()
    }
  }, [accessToken, url])

  const pageCount = pdf?.numPages ?? 0

  useEffect(() => {
    if (!pdf || !canvasRef.current) return

    let cancelled = false
    void pdf.getPage(pageNumber).then(async (page) => {
      if (cancelled || !canvasRef.current) return
      const viewport = page.getViewport({ scale: 1.2 })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: context, viewport }).promise
    })

    return () => {
      cancelled = true
    }
  }, [pageNumber, pdf])

  const thumbnails = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1), [pageCount])
  const fieldsOnPage = useMemo(() => fields.filter((field) => field.pageNumber === pageNumber), [fields, pageNumber])
  const fieldCountByPage = useMemo(() => {
    const counts = new Map<number, number>()
    for (const field of fields) counts.set(field.pageNumber, (counts.get(field.pageNumber) ?? 0) + 1)
    return counts
  }, [fields])

  function relativePosition(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return null
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1)
    return { x, y }
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (!selectedAssignee) return
    const point = relativePosition(event)
    if (!point) return
    setDragStart(point)
    setDragCurrent(point)
  }

  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (!dragStart) return
    const point = relativePosition(event)
    if (point) setDragCurrent(point)
  }

  function handleMouseUp() {
    if (!dragStart || !dragCurrent || !selectedAssignee) {
      setDragStart(null)
      setDragCurrent(null)
      return
    }
    const x = Math.min(dragStart.x, dragCurrent.x)
    const y = Math.min(dragStart.y, dragCurrent.y)
    const width = Math.abs(dragCurrent.x - dragStart.x)
    const height = Math.abs(dragCurrent.y - dragStart.y)
    setDragStart(null)
    setDragCurrent(null)

    if (width < MIN_FIELD_FRACTION || height < MIN_FIELD_FRACTION) return

    onAddField({
      localId: crypto.randomUUID(),
      assigneeRowId: selectedAssignee.id,
      assigneeLabel: selectedAssignee.label,
      fieldType: selectedFieldType,
      pageNumber,
      x,
      y,
      width,
      height,
    })
  }

  const previewRect = dragStart && dragCurrent
    ? {
        left: `${Math.min(dragStart.x, dragCurrent.x) * 100}%`,
        top: `${Math.min(dragStart.y, dragCurrent.y) * 100}%`,
        width: `${Math.abs(dragCurrent.x - dragStart.x) * 100}%`,
        height: `${Math.abs(dragCurrent.y - dragStart.y) * 100}%`,
      }
    : null

  if (isLoading) {
    return <div className="pdf-viewer-state">Loading PDF…</div>
  }

  if (error) {
    return <div className="pdf-viewer-state pdf-viewer-error" role="alert">{error}</div>
  }

  if (!pdf) {
    return <div className="pdf-viewer-state">PDF unavailable.</div>
  }

  return (
    <div className="pdf-viewer field-placement-viewer">
      <aside className="pdf-thumbnails" aria-label="Page thumbnails">
        {thumbnails.map((page) => (
          <button
            key={page}
            type="button"
            className={page === pageNumber ? 'pdf-thumb active' : 'pdf-thumb'}
            onClick={() => setPageNumber(page)}
          >
            Page {page}
            {fieldCountByPage.get(page) ? ` (${fieldCountByPage.get(page)})` : ''}
          </button>
        ))}
      </aside>
      <div className="pdf-stage">
        <div className="field-placement-toolbar form-grid">
          <label>
            Assignee
            <select value={selectedAssigneeId} onChange={(event) => setSelectedAssigneeId(event.target.value)}>
              {assigneeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Field type
            <select
              value={selectedFieldType}
              onChange={(event) => setSelectedFieldType(event.target.value as SignatureFieldType)}
            >
              {availableFieldTypes.map((fieldType) => (
                <option key={fieldType} value={fieldType}>
                  {signatureFieldTypeLabel(fieldType)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="field-placement-hint">
          Drag a box on the page below to place the selected field for the selected assignee.
        </p>
        <div className="pdf-toolbar">
          <div className="pdf-toolbar-group">
            <button className="button" type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
              Previous
            </button>
            <span>{pageNumber} / {pageCount}</span>
            <button
              className="button"
              type="button"
              disabled={pageNumber >= pageCount}
              onClick={() => setPageNumber((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
        <div className="pdf-canvas-wrap">
          <div className="field-placement-stage">
            <canvas ref={canvasRef} className="pdf-canvas" />
            <div
              ref={overlayRef}
              className="field-placement-overlay"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                setDragStart(null)
                setDragCurrent(null)
              }}
            >
              {fieldsOnPage.map((field) => (
                <div
                  key={field.localId}
                  className="field-placement-box"
                  style={{
                    left: `${field.x * 100}%`,
                    top: `${field.y * 100}%`,
                    width: `${field.width * 100}%`,
                    height: `${field.height * 100}%`,
                  }}
                >
                  <span>{signatureFieldTypeLabel(field.fieldType)}</span>
                  <button
                    type="button"
                    aria-label="Remove field"
                    onClick={(event) => {
                      event.stopPropagation()
                      onRemoveField(field.localId)
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {previewRect ? <div className="field-placement-box preview" style={previewRect} /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
