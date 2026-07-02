/** Active assignments due within this window count as "due soon" on the dashboard. */
export const DUE_SOON_WINDOW_DAYS = 7

export interface DashboardDueDateBounds {
  now: string
  dueSoonCutoff: string
}

export function dashboardDueDateBounds(reference = new Date()): DashboardDueDateBounds {
  const dueSoonCutoff = new Date(reference)
  dueSoonCutoff.setUTCDate(dueSoonCutoff.getUTCDate() + DUE_SOON_WINDOW_DAYS)
  return {
    now: reference.toISOString(),
    dueSoonCutoff: dueSoonCutoff.toISOString(),
  }
}
