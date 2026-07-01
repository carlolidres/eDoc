export type RoutingMode = 'sequential' | 'parallel' | 'mixed'
export type StepStatus = 'pending' | 'active' | 'completed' | 'rejected' | 'returned' | 'invalidated'

export interface RouteStepState {
  id: string
  sequence: number
  status: StepStatus
  requiredCount: number
  completedCount: number
}

export function getNextActiveSteps(mode: RoutingMode, steps: RouteStepState[]): string[] {
  const ordered = [...steps].sort((a, b) => a.sequence - b.sequence)
  if (mode === 'parallel') return ordered.filter((step) => step.status === 'pending').map((step) => step.id)
  const firstPending = ordered.find((step) => step.status === 'pending')
  return firstPending ? [firstPending.id] : []
}

export function isStepComplete(step: RouteStepState): boolean {
  return step.completedCount >= step.requiredCount
}
