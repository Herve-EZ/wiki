import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Icon } from "./Icon";

interface Props {
  workspace: string;
  onPick: (pageId: string) => void;
  onClose: () => void;
}

export function SearchPalette({ workspace, onPick, onClose }: Props) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 180);
    return () => clearTimeout(id);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", workspace, debounced],
    queryFn: () => api.search(debounced, workspace),
    enabled: debounced.length >= 2,
  });
  const results = data ?? [];

  useEffect(() => {
    setActive(0);
  }, [debounced]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      onPick(results[active].id);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Rechercher dans l'espace…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="palette-results">
          {debounced.length < 2 ? (
            <div className="palette-empty">Tapez au moins 2 caractères.</div>
          ) : isFetching && results.length === 0 ? (
            <div className="palette-empty">Recherche…</div>
          ) : results.length === 0 ? (
            <div className="palette-empty">Aucune page trouvée.</div>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                className={`palette-item${i === active ? " active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(p.id)}
              >
                <Icon name="file" size={14} />
                <span>{p.title}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
