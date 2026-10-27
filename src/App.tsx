import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { PrivateRoute, PublicOnlyRoute } from "./auth/PrivateRoute";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NewsDetailModal from "./pages/NewsDetailModal";
import NewsPage from "./pages/NewsPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import SagasPage from "./pages/SagasPage";
import SagaStoryPage from "./pages/SagaStoryPage";
import WantedDetailPage from "./pages/WantedDetailPage";
import WantedPage from "./pages/WantedPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/wanted" element={<WantedPage />} />
              <Route path="/wanted/:id" element={<WantedDetailPage />} />
              <Route path="/news" element={<NewsPage />}>
                <Route path=":id" element={<NewsDetailModal />} />
              </Route>
              <Route path="/sagas" element={<SagasPage />} />
              <Route path="/sagas/:id" element={<SagaStoryPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
