const allowedTypes = ['application/pdf']

export function validatePdfFile(file: File, maxBytes: number) {
  if (!allowedTypes.includes(file.type)) return 'Only PDF files are allowed.'
  if (file.size > maxBytes) return `File must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`
  return null
}
