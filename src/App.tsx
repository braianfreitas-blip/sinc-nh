import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EventProvider } from "@/contexts/EventContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import PublicRSVPPage from "./pages/PublicRSVPPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import GuestListPage from "./pages/GuestListPage";
import WhatsAppImportPage from "./pages/WhatsAppImportPage";
import FinancialPage from "./pages/FinancialPage";
import CheckinPage from "./pages/CheckinPage";
import EventSettingsPage from "./pages/EventSettingsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EventProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<PublicRSVPPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminRoute><DashboardPage /></AdminRoute>} />
              <Route path="/admin/guests" element={<AdminRoute><GuestListPage /></AdminRoute>} />
              <Route path="/admin/import" element={<AdminRoute><WhatsAppImportPage /></AdminRoute>} />
              <Route path="/admin/financial" element={<AdminRoute><FinancialPage /></AdminRoute>} />
              <Route path="/admin/checkin" element={<AdminRoute><CheckinPage /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><EventSettingsPage /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </EventProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
