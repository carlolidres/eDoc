import { BarChart3, FilePlus2, Files, Inbox, LayoutDashboard, PenLine, Route, Settings } from 'lucide-react'

export const APP_NAME = 'eDoc'
export const APP_TAGLINE = 'Secure document routing'

export const navigationItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inbox', label: 'My Inbox', icon: Inbox },
  { path: '/documents', label: 'Documents', icon: Files },
  { path: '/documents/new', label: 'Create Document', icon: FilePlus2 },
  { path: '/routing/templates', label: 'Routing Templates', icon: Route },
  { path: '/sign/demo-assignment', label: 'Signing Workspace', icon: PenLine },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/admin', label: 'Administration', icon: Settings },
] as const
