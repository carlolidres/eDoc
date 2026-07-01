import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { DashboardPage } from '../pages/DashboardPage'
import { DocumentsPage } from '../pages/DocumentsPage'
import { InboxPage } from '../pages/InboxPage'
import { CreateDocumentPage } from '../pages/CreateDocumentPage'
import { RoutingTemplatesPage } from '../pages/RoutingTemplatesPage'
import { SigningWorkspacePage } from '../pages/SigningWorkspacePage'
import { ReportsPage } from '../pages/ReportsPage'
import { AdminPage } from '../pages/AdminPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/new" element={<CreateDocumentPage />} />
        <Route path="routing/templates" element={<RoutingTemplatesPage />} />
        <Route path="sign/:assignmentId" element={<SigningWorkspacePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="reset-password" element={<Navigate to="/reset-password" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
