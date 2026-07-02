export interface NormalizedFieldRect {
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
}

export function normalizedFieldToPdfRect(
  pageWidth: number,
  pageHeight: number,
  field: Pick<NormalizedFieldRect, 'x' | 'y' | 'width' | 'height'>,
) {
  return {
    x: field.x * pageWidth,
    y: pageHeight - (field.y + field.height) * pageHeight,
    width: field.width * pageWidth,
    height: field.height * pageHeight,
  }
}
