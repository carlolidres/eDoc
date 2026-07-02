export type RoutingMode = 'sequential' | 'parallel' | 'mixed'
export type StepStatus = 'pending' | 'active' | 'completed' | 'rejected' | 'returned' | 'skipped' | 'invalidated'
export type CompletionRule = 'all' | 'any' | 'majority' | 'minimum_count'
export type AssigneeStatus = 'pending' | 'active' | 'completed' | 'rejected' | 'returned' | 'delegated' | 'invalidated'

export interface AssigneeState {
  id: string
  status: AssigneeStatus
}

export interface RouteStepState {
  id: string
  sequence: number
  status: StepStatus
}

export function getRequiredCompletionCount(
  rule: CompletionRule,
  assigneeCount: number,
  minimumCount?: number | null,
): number {
  if (assigneeCount <= 0) return 0
  switch (rule) {
    case 'any':
      return 1
    case 'majority':
      return Math.floor(assigneeCount / 2) + 1
    case 'minimum_count':
      return Math.min(assigneeCount, Math.max(1, minimumCount ?? 1))
    case 'all':
    default:
      return assigneeCount
  }
}

export function countEligibleAssignees(assignees: AssigneeState[]): number {
  return assignees.filter((assignee) => assignee.status !== 'invalidated' && assignee.status !== 'delegated').length
}

export function countCompletedAssignees(assignees: AssigneeState[]): number {
  return assignees.filter((assignee) => assignee.status === 'completed').length
}

export function isStepCompleteByRule(
  rule: CompletionRule,
  assignees: AssigneeState[],
  minimumCount?: number | null,
): boolean {
  const eligible = countEligibleAssignees(assignees)
  const required = getRequiredCompletionCount(rule, eligible, minimumCount)
  return countCompletedAssignees(assignees) >= required
}

export function getNextActiveStepIds(mode: RoutingMode, steps: RouteStepState[]): string[] {
  const ordered = [...steps].sort((a, b) => a.sequence - b.sequence)
  if (mode === 'parallel') return ordered.filter((step) => step.status === 'pending').map((step) => step.id)
  const firstPending = ordered.find((step) => step.status === 'pending')
  return firstPending ? [firstPending.id] : []
}

export function isRouteComplete(steps: Array<{ status: StepStatus }>): boolean {
  return steps.length > 0 && steps.every((step) => step.status === 'completed' || step.status === 'skipped')
}

export function shouldInvalidateRemainingAssignees(rule: CompletionRule, assignees: AssigneeState[]): boolean {
  return rule === 'any' && isStepCompleteByRule(rule, assignees)
}
