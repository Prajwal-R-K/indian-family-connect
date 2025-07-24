
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/AuthPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
