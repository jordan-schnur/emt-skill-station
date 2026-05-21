import { toasts } from "../../store/appStore";

export function Toast() {
  const items = toasts.value;
  if (!items.length) return null;

  return (
    <>
      {items.map((t) => {
        if (t.type === "achievement" && t.achievement) {
          const a = t.achievement;
          return (
            <div key={t.id} class="toast toast-achievement">
              <span class="ach-toast-icon">{a.icon}</span>
              <span>
                <strong>{a.name}</strong>
                <div class="ach-toast-desc">{a.desc}</div>
              </span>
            </div>
          );
        }
        return (
          <div key={t.id} class="toast">
            {t.message}
          </div>
        );
      })}
    </>
  );
}
