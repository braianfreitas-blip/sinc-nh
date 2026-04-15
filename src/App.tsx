import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useParams, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EventProvider } from "@/contexts/EventContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import PublicRSVPPage from "./pages/PublicRSVPPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import GuestListPage from "./pages/GuestListPage";
import WhatsAppImportPage from "./pages/WhatsAppImportPage";
import FinancialPage from "./pages/FinancialPage";
import CheckinPage from "./pages/CheckinPage";
import EventSettingsPage from "./pages/EventSettingsPage";
import InvitesPage from "./pages/InvitesPage";
import EventsListPage from "./pages/EventsListPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function EventAdminRoute({ children }: { children: React.ReactNode }) {
  const { eventId } = useParams<{ eventId: string }>();
  if (!eventId) return <Navigate to="/admin" replace />;
  return (
    <ProtectedRoute>
      <EventProvider eventId={eventId}>
        <AdminLayout>{children}</AdminLayout>
      </EventProvider>
    </ProtectedRoute>
  );
}

function PublicEventRoute() {
  const { eventId } = useParams<{ eventId: string }>();
  if (!eventId) return <NotFound />;
  return (
    <EventProvider eventId={eventId}>
      <PublicRSVPPage />
    </EventProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/event/:eventId" element={<PublicEventRoute />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<ProtectedRoute><EventsListPage /></ProtectedRoute>} />
            <Route path="/admin/invites" element={<ProtectedRoute><InvitesPageWrapper /></ProtectedRoute>} />
            <Route path="/admin/events/:eventId" element={<EventAdminRoute><DashboardPage /></EventAdminRoute>} />
            <Route path="/admin/events/:eventId/guests" element={<EventAdminRoute><GuestListPage /></EventAdminRoute>} />
            <Route path="/admin/events/:eventId/import" element={<EventAdminRoute><WhatsAppImportPage /></EventAdminRoute>} />
            <Route path="/admin/events/:eventId/financial" element={<EventAdminRoute><FinancialPage /></EventAdminRoute>} />
            <Route path="/admin/events/:eventId/checkin" element={<EventAdminRoute><CheckinPage /></EventAdminRoute>} />
            <Route path="/admin/events/:eventId/settings" element={<EventAdminRoute><EventSettingsPage /></EventAdminRoute>} />
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
