import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import type { PresentUser } from "../hooks/usePageSocket";

interface Props {
  workspaceName: string;
  pageTitle: string;
  saved: boolean;
  saving: boolean;
  versionLabel?: string;
  present: PresentUser[];
  commentCount?: number;
  onOpenSearch: () => void;
  onOpenHistory: () => void;
  onOpenComments: () => void;
}

export function TopBar({
  workspaceName,
  pageTitle,
  saved,
  saving,
  versionLabel,
  present,
  commentCount = 0,
  onOpenSearch,
  onOpenHistory,
  onOpenComments,
}: Props) {
  return (
    <div className="tb">
      <span className="crumb">
        <Icon name="book" size={15} style={{ color: "var(--ink-3)" }} />
        {workspaceName}
        <span className="sep">/</span>
        <span className="cur">{pageTitle}</span>
      </span>

      <span className="save-state">
        {saving ? (
          <>
            <span className="spinner" style={{ width: 12, height: 12 }} /> Enregistrement…
          </>
        ) : saved ? (
          <>
            <Icon name="check" size={12} className="ic ok" /> Enregistré
            {versionLabel ? ` · ${versionLabel}` : ""}
          </>
        ) : (
          "Modifié"
        )}
      </span>

      <div className="tb-right">
        <button className="searchbox" onClick={onOpenSearch}>
          <Icon name="search" size={14} />
          Rechercher
          <span className="kbd">Ctrl K</span>
        </button>

        {present.length > 0 && (
          <div className="avatars">
            {present.slice(0, 4).map((u) => (
              <Avatar
                key={u.user_id}
                seed={u.email}
                label={u.display_name || u.email}
                src={u.avatar_url || undefined}
              />
            ))}
          </div>
        )}

        <button className="btn btn-ghost" onClick={onOpenComments}>
          <Icon name="mail" size={14} />
          Commentaires
          {commentCount > 0 && <span className="tb-badge">{commentCount}</span>}
        </button>

        <button className="btn btn-ghost" onClick={onOpenHistory}>
          <Icon name="history" size={14} />
          Historique
        </button>
      </div>
    </div>
  );
}
