import { openHelpModal } from "./Modal";

interface Props {
  title: string;
  bodyHTML: string;
}

export function HelpIcon({ title, bodyHTML }: Props) {
  return (
    <button
      class="help-icon"
      type="button"
      aria-label={`Help: ${title}`}
      title="Help"
      onClick={(e) => {
        e.stopPropagation();
        openHelpModal(title, bodyHTML);
      }}
    >
      ?
    </button>
  );
}
