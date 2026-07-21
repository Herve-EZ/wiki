import { useEffect, useRef, useState } from "react";
import type { Member } from "../../lib/types";

interface Props {
  members: Member[];
  onPick: (member: Member) => void;
  onClose: () => void;
}

export function MentionPicker({ members, onPick, onClose }: Props) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = members.filter((m) => {
    const low = q.toLowerCase();
    return (
      m.display_name.toLowerCase().includes(low) ||
      m.email.toLowerCase().includes(low)
    );
  }).slice(0, 8);

  useEffect(() => {
    setActive(0);
  }, [q]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && filtered[active]) {
      e.preventDefault();
      onPick(filtered[active]);
    }
  }

  return (
    <div className="mention-picker">
      <input
        ref={inputRef}
        className="mention-picker-input"
        placeholder="Mentionner un membre…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="mention-picker-list">
        {filtered.length === 0 && (
          <div className="palette-empty" style={{ padding: "8px 12px" }}>
            Aucun résultat
          </div>
        )}
        {filtered.map((m, i) => (
          <button
            key={m.id}
            className={`mention-picker-item${i === active ? " active" : ""}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => onPick(m)}
          >
            <span className="mention-name">{m.display_name || m.email}</span>
            {m.display_name && (
              <span className="mention-email">{m.email}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
