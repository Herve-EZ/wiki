import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Icon } from "../Icon";
import { DiffView } from "./DiffView";

interface Props {
  pageId: string;
  canRestore: boolean;
  onClose: () => void;
}

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function HistoryModal({ pageId, canRestore, onClose }: Props) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);

  const versionsQ = useQuery({
    queryKey: ["versions", pageId],
    queryFn: () => api.versions(pageId),
  });
  const versions = useMemo(() => versionsQ.data ?? [], [versionsQ.data]);

  // Default comparison: the two most recent versions.
  const pair = useMemo(() => {
    if (selected.length === 2) return [...selected].sort((a, b) => a - b);
    if (versions.length >= 2) {
      return [versions[1].version_number, versions[0].version_number];
    }
    return null;
  }, [selected, versions]);

  const diffQ = useQuery({
    queryKey: ["diff", pageId, pair?.[0], pair?.[1]],
    queryFn: () => api.diff(pageId, pair![0], pair![1]),
    enabled: pair !== null,
  });

  const restoreM = useMutation({
    mutationFn: (n: number) => api.restore(pageId, n),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["versions", pageId] });
      void qc.invalidateQueries({ queryKey: ["page", pageId] });
      onClose();
    },
  });

  function pick(n: number) {
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length < 2) return [...prev, n];
      return [n];
    });
  }

  const isSelected = (n: number) =>
    selected.includes(n) || (selected.length < 2 && pair?.includes(n));

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 860, height: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <Icon name="history" size={17} style={{ marginRight: 8 }} />
          Historique des versions
          <button
            className="icon-btn"
            style={{ marginLeft: "auto" }}
            onClick={onClose}
            aria-label="Fermer"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="hist">
          <aside className="vlist">
            <div className="vlist-h">
              {selected.length === 2
                ? "Comparaison de 2 versions"
                : "Sélectionnez 2 versions à comparer"}
            </div>
            {versionsQ.isLoading && <div className="center-fill"><div className="spinner" /></div>}
            {versions.map((v, i) => (
              <button
                key={v.id}
                className={`vrow${isSelected(v.version_number) ? " sel" : ""}`}
                onClick={() => pick(v.version_number)}
              >
                <span className="vnum">v{v.version_number}</span>
                <span>
                  <span className="vwho">
                    {v.author_email ?? "—"}
                    {i === 0 && <span className="vtag">actuelle</span>}
                  </span>
                  <br />
                  <span className="vwhen">{when(v.created_at)}</span>
                </span>
              </button>
            ))}
          </aside>

          {diffQ.data && pair ? (
            <DiffView
              diff={diffQ.data}
              fromN={pair[0]}
              toN={pair[1]}
              canRestore={canRestore}
              restoring={restoreM.isPending}
              onRestore={() => restoreM.mutate(pair[0])}
            />
          ) : (
            <div className="diffpane">
              <div className="center-fill">
                {diffQ.isFetching ? <div className="spinner" /> : "Choisissez deux versions."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
