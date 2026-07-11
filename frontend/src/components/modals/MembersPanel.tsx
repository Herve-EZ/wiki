import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../../lib/api";
import type { Role } from "../../lib/types";
import { Icon } from "../Icon";

const ROLES: Role[] = ["owner", "editor", "viewer"];
const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  editor: "Éditeur",
  viewer: "Lecteur",
};

interface Props {
  workspaceSlug: string;
}

export function MembersPanel({ workspaceSlug }: Props) {
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const membersQ = useQuery({
    queryKey: ["members", workspaceSlug],
    queryFn: () => api.listMembers(workspaceSlug),
  });
  const invitesQ = useQuery({
    queryKey: ["invitations", workspaceSlug],
    queryFn: () => api.listWorkspaceInvitations(workspaceSlug),
  });

  const invalidateMembers = () =>
    void qc.invalidateQueries({ queryKey: ["members", workspaceSlug] });
  const invalidateInvites = () =>
    void qc.invalidateQueries({ queryKey: ["invitations", workspaceSlug] });

  const roleM = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api.updateMember(workspaceSlug, id, role),
    onSuccess: invalidateMembers,
    onError: (err) =>
      setError(err instanceof ApiError ? err.detail : "Échec du changement de rôle."),
  });
  const removeM = useMutation({
    mutationFn: (id: string) => api.removeMember(workspaceSlug, id),
    onSuccess: invalidateMembers,
    onError: (err) =>
      setError(err instanceof ApiError ? err.detail : "Impossible de retirer ce membre."),
  });
  const inviteM = useMutation({
    mutationFn: () =>
      api.createInvitation(workspaceSlug, { email: inviteEmail.trim(), role: inviteRole }),
    onSuccess: () => {
      setNotice(`Invitation envoyée à ${inviteEmail.trim()}.`);
      setInviteEmail("");
      invalidateInvites();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.detail : "Échec de l'invitation."),
  });
  const revokeM = useMutation({
    mutationFn: (id: string) => api.revokeInvitation(workspaceSlug, id),
    onSuccess: invalidateInvites,
  });

  function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!inviteEmail.trim()) return;
    inviteM.mutate();
  }

  return (
    <div>
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice">{notice}</p>}

      <div className="sb-label" style={{ padding: "4px 0" }}>Membres</div>
      {(membersQ.data ?? []).map((m) => (
        <div key={m.id} className="row-card">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row-title">{m.display_name || m.email}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{m.email}</div>
          </div>
          <select
            className="input"
            style={{ width: 130 }}
            value={m.role}
            onChange={(e) => roleM.mutate({ id: m.id, role: e.target.value as Role })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <button
            className="icon-btn"
            title="Retirer"
            onClick={() => removeM.mutate(m.id)}
          >
            <Icon name="x" size={15} />
          </button>
        </div>
      ))}

      <div className="sb-label" style={{ padding: "12px 0 4px" }}>Inviter</div>
      <form onSubmit={invite} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="inv-email">Adresse email</label>
          <input
            id="inv-email"
            className="input"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="collaborateur@exemple.com"
            required
          />
        </div>
        <select
          className="input"
          style={{ width: 130 }}
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit" disabled={inviteM.isPending}>
          Inviter
        </button>
      </form>

      {(invitesQ.data ?? []).length > 0 && (
        <>
          <div className="sb-label" style={{ padding: "12px 0 4px" }}>
            Invitations en attente
          </div>
          {(invitesQ.data ?? []).map((inv) => (
            <div key={inv.id} className="row-card">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-title">{inv.email}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {ROLE_LABEL[inv.role]} · en attente
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => revokeM.mutate(inv.id)}>
                Révoquer
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
