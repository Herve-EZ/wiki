import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "../components/Icon";
import { NewWorkspaceModal } from "../components/modals/NewWorkspaceModal";

/** Shown when the user belongs to no workspace yet: onboarding with a create
 * button and any pending invitations to accept. */
export function WelcomeRoute() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const invitesQ = useQuery({
    queryKey: ["my-invitations"],
    queryFn: () => api.listMyInvitations(),
  });

  const acceptM = useMutation({
    mutationFn: (token: string) => api.acceptInvitation(token),
    onSuccess: (ws) => {
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
      void qc.invalidateQueries({ queryKey: ["my-invitations"] });
      navigate(`/w/${ws.slug}`);
    },
  });
  const declineM = useMutation({
    mutationFn: (token: string) => api.declineInvitation(token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["my-invitations"] }),
  });

  const invites = invitesQ.data ?? [];

  return (
    <div className="auth-page">
      <div className="card" style={{ maxWidth: 460 }}>
        <h4>Bienvenue{user?.display_name ? `, ${user.display_name}` : ""} 👋</h4>
        <p className="sub">
          Vous n'appartenez encore à aucun espace de travail. Créez le vôtre, ou
          acceptez une invitation.
        </p>

        <button className="btn btn-primary btn-block" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={13} /> Créer mon espace de travail
        </button>

        {invites.length > 0 && (
          <>
            <div className="div-or">invitations en attente</div>
            {invites.map((inv) => (
              <div key={inv.id} className="row-card">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row-title">{inv.workspace_name}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    invité par {inv.invited_by_name || inv.invited_by_email || "?"}
                  </div>
                </div>
                <button className="btn btn-ghost" disabled={declineM.isPending} onClick={() => declineM.mutate(inv.token)}>
                  Refuser
                </button>
                <button className="btn btn-primary" disabled={acceptM.isPending} onClick={() => acceptM.mutate(inv.token)}>
                  Accepter
                </button>
              </div>
            ))}
          </>
        )}

        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 18 }}>
          <button className="link" onClick={() => navigate("/help")}>
            <Icon name="help" size={12} /> Aide
          </button>
          <button className="link" onClick={() => navigate("/settings")}>
            <Icon name="settings" size={12} /> Paramètres
          </button>
          <button className="link" onClick={() => void logout()}>
            <Icon name="logout" size={12} /> Se déconnecter
          </button>
        </div>
      </div>

      {createOpen && (
        <NewWorkspaceModal
          onClose={() => setCreateOpen(false)}
          onCreated={(slug) => {
            setCreateOpen(false);
            navigate(`/w/${slug}`);
          }}
        />
      )}
    </div>
  );
}
