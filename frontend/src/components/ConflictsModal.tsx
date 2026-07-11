import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { evictPage, listConflicts, type ConflictEntry } from "../lib/db";
import { Icon } from "./Icon";

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

/** Resolve queued edits that couldn't be pushed. The common case is a page that
 * was deleted on the server (404): the user chooses to forget it locally, or to
 * recreate it from the local copy. */
export function ConflictsModal({ onClose, onChanged }: Props) {
  const qc = useQueryClient();
  const [entries, setEntries] = useState<ConflictEntry[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    listConflicts()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  useEffect(() => load(), [load]);

  function afterChange() {
    load();
    onChanged();
    void qc.invalidateQueries({ queryKey: ["pages"] });
  }

  async function forget(entry: ConflictEntry) {
    setBusy(entry.seq);
    try {
      await evictPage(entry.page_id);
      afterChange();
    } finally {
      setBusy(null);
    }
  }

  async function recreate(entry: ConflictEntry) {
    if (!entry.workspace || !entry.title) return;
    setBusy(entry.seq);
    try {
      await api.createPage({
        workspace: entry.workspace,
        title: entry.title,
        content_md: entry.content_md ?? "",
        status: (entry.status as never) ?? "draft",
      });
      await evictPage(entry.page_id);
      afterChange();
    } finally {
      setBusy(null);
    }
  }

  const isMissing = (e: ConflictEntry) => e.last_error?.startsWith("404");

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>Modifications bloquées</span>
          <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="modal-body">
          {entries.length === 0 && (
            <p className="muted">Aucune modification bloquée. 🎉</p>
          )}
          {entries.map((e) => (
            <div key={e.seq} className="row-card">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-title">{e.title ?? "Page inconnue"}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {isMissing(e)
                    ? "Cette page n'existe plus sur le serveur."
                    : `Conflit : ${e.last_error}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-danger"
                  disabled={busy === e.seq}
                  onClick={() => void forget(e)}
                >
                  Supprimer
                </button>
                <button
                  className="btn btn-primary"
                  disabled={busy === e.seq || !e.workspace || !e.title}
                  onClick={() => void recreate(e)}
                >
                  Recréer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
