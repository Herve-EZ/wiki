import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "../components/Icon";
import type { Role } from "../lib/types";

const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  editor: "Éditeur",
  viewer: "Lecteur",
};

const STATUS_LABEL: Record<string, string> = {
  accepted: "déjà acceptée",
  declined: "refusée",
  revoked: "révoquée",
  expired: "expirée",
};

export function InviteRoute() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { status } = useAuth();
  const [error, setError] = useState("");

  const invQ = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => api.getInvitation(token),
    retry: false,
  });

  const acceptM = useMutation({
    mutationFn: () => api.acceptInvitation(token),
    onSuccess: (ws) => {
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
      void qc.invalidateQueries({ queryKey: ["my-invitations"] });
      navigate(`/w/${ws.slug}`, { replace: true });
    },
    onError: (err) =>
      setError(
        err instanceof ApiError && err.status === 403
          ? "Cette invitation a été envoyée à une autre adresse email."
          : err instanceof ApiError
            ? err.detail
            : "Impossible d'accepter l'invitation.",
      ),
  });

  const declineM = useMutation({
    mutationFn: () => api.declineInvitation(token),
    onSuccess: () => navigate("/", { replace: true }),
  });

  return (
    <div className="auth-page">
      <div className="card">
        <h4>Invitation à collaborer</h4>

        {invQ.isLoading && <div className="spinner" />}

        {invQ.isError && (
          <>
            <p className="form-error">Invitation introuvable ou expirée.</p>
            <button
              className="btn btn-ghost btn-block"
              onClick={() => navigate("/", { replace: true })}
            >
              <Icon name="home" size={14} /> Retour à l'accueil
            </button>
          </>
        )}

        {invQ.data && (
          <>
            <p className="sub">
              Vous êtes invité(e) à rejoindre l'espace{" "}
              <b>« {invQ.data.workspace_name} »</b> en tant que{" "}
              <b>{ROLE_LABEL[invQ.data.role]}</b>.
            </p>

            {error && <p className="form-error">{error}</p>}

            {invQ.data.status !== "pending" ? (
              <>
                <p className="mfa-note">
                  <Icon name="alert" size={12} /> Cette invitation n'est plus
                  active ({STATUS_LABEL[invQ.data.status] ?? invQ.data.status}).
                </p>
                <button
                  className="btn btn-ghost btn-block"
                  style={{ marginTop: 10 }}
                  onClick={() => navigate("/", { replace: true })}
                >
                  <Icon name="home" size={14} /> Retour à l'accueil
                </button>
              </>
            ) : invQ.data.is_expired ? (
              <>
                <p className="mfa-note">
                  <Icon name="alert" size={12} /> Cette invitation a expiré.
                </p>
                <button
                  className="btn btn-ghost btn-block"
                  style={{ marginTop: 10 }}
                  onClick={() => navigate("/", { replace: true })}
                >
                  <Icon name="home" size={14} /> Retour à l'accueil
                </button>
              </>
            ) : status === "authenticated" ? (
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button className="btn btn-ghost" disabled={declineM.isPending} onClick={() => declineM.mutate()}>
                  Refuser
                </button>
                <button
                  className="btn btn-primary"
                  style={{ marginLeft: "auto" }}
                  disabled={acceptM.isPending}
                  onClick={() => { setError(""); acceptM.mutate(); }}
                >
                  {acceptM.isPending ? "…" : "Accepter l'invitation"}
                </button>
              </div>
            ) : (
              <>
                <p className="mfa-note">
                  Connectez-vous ou créez un compte avec l'adresse{" "}
                  <b>{invQ.data.email}</b> pour accepter.
                </p>
                <button
                  className="btn btn-primary btn-block"
                  onClick={() =>
                    navigate("/login", { state: { next: `/invite/${token}`, email: invQ.data?.email } })
                  }
                >
                  Se connecter / s'inscrire
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
