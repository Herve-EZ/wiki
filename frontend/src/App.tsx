import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import { useAuth } from "./auth/AuthContext";
import { Icon } from "./components/Icon";
import { LoginRoute } from "./routes/LoginRoute";
import { WorkspaceLayout } from "./routes/WorkspaceLayout";
import { PageRoute } from "./routes/PageRoute";
import { SettingsRoute } from "./routes/SettingsRoute";
import { InviteRoute } from "./routes/InviteRoute";

function Loading() {
  return (
    <div className="center-fill">
      <div className="spinner" />
    </div>
  );
}

function RequireAuth() {
  const { status } = useAuth();
  if (status === "loading") return <Loading />;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RootRedirect() {
  const q = useQuery({ queryKey: ["workspaces"], queryFn: api.listWorkspaces });
  if (q.isLoading) return <Loading />;
  const first = q.data?.[0];
  if (first) return <Navigate to={`/w/${first.slug}`} replace />;
  return (
    <div className="center-fill" style={{ flexDirection: "column", gap: 8 }}>
      <Icon name="book" size={26} />
      Aucun espace de travail. Créez-en un depuis l'admin Django.
    </div>
  );
}

function WorkspaceIndex() {
  return (
    <div className="center-fill" style={{ flexDirection: "column", gap: 8 }}>
      <Icon name="file" size={26} />
      Sélectionnez une page dans la barre latérale.
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/invite/:token" element={<InviteRoute />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="/w/:workspace" element={<WorkspaceLayout />}>
            <Route index element={<WorkspaceIndex />} />
            <Route path=":pageId" element={<PageRoute />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
