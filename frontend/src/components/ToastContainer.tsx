import { useCallback, useState } from "react";
import { Icon } from "./Icon";

interface Toast {
  id: number;
  text: string;
  icon?: string;
}

let _push: ((text: string, icon?: string) => void) | null = null;

export function pushGlobalToast(text: string, icon?: string) {
  _push?.(text, icon);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, icon?: string) => {
    const id = Date.now() + Math.floor(performance.now());
    setToasts((t) => [...t, { id, text, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  _push = push;

  if (toasts.length === 0) return null;

  return (
    <div className="global-toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <Icon name={t.icon ?? "check"} size={14} style={{ color: "var(--accent)" }} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
