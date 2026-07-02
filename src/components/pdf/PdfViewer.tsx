import { useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url: string
  accessToken: string
}

export function PdfViewer({ url, accessToken }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      const viewport = page.getViewport({ scale: zoom })
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
  }, [pageNumber, pdf, zoom])

  const thumbnails = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1), [pageCount])

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
    <div className="pdf-viewer">
      <aside className="pdf-thumbnails" aria-label="Page thumbnails">
        {thumbnails.map((page) => (
          <button
            key={page}
            type="button"
            className={page === pageNumber ? 'pdf-thumb active' : 'pdf-thumb'}
            onClick={() => setPageNumber(page)}
          >
            Page {page}
          </button>
        ))}
      </aside>
      <div className="pdf-stage">
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
          <div className="pdf-toolbar-group">
            <button className="button" type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>Zoom out</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button className="button" type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>Zoom in</button>
          </div>
        </div>
        <div className="pdf-canvas-wrap">
          <canvas ref={canvasRef} className="pdf-canvas" />
        </div>
      </div>
    </div>
  )
}
