import { signal } from "@preact/signals";

// ─── Types ─────────────────────────────────────────────────────────────────

type HelpModal = {
  type: "help";
  title: string;
  bodyHTML: string;
};

type ConfirmModal = {
  type: "confirm";
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

type ConflictModal = {
  type: "conflict";
  localUpdatedAt: string | null;
  cloudUpdatedAt: string | null;
  onKeepLocal: () => void;
  onUseCloud: () => void;
};

export type ModalContent = HelpModal | ConfirmModal | ConflictModal;

// ─── Signal ────────────────────────────────────────────────────────────────

const activeModal = signal<ModalContent | null>(null);

export function openHelpModal(title: string, bodyHTML: string): void {
  activeModal.value = { type: "help", title, bodyHTML };
}

export function openConfirmModal(opts: Omit<ConfirmModal, "type">): void {
  activeModal.value = { type: "confirm", ...opts };
}

export function openConflictModal(opts: Omit<ConflictModal, "type">): void {
  activeModal.value = { type: "conflict", ...opts };
}

export function closeModal(): void {
  activeModal.value = null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function relativeTime(isoStr: string | null): string {
  if (!isoStr) return "unknown";
  const diff = Math.round((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.round(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.round(diff / 604800)}w ago`;
  if (diff < 31536000) return `${Math.round(diff / 2592000)}mo ago`;
  return `${Math.round(diff / 31536000)}y ago`;
}

// ─── Sub-renderers ─────────────────────────────────────────────────────────

function HelpModalContent({ modal }: { modal: HelpModal }) {
  return (
    <div class="help-modal">
      <div class="help-modal-header">
        <strong>{modal.title}</strong>
        <button class="help-modal-close" type="button" aria-label="Close" onClick={closeModal}>✕</button>
      </div>
      <div class="help-modal-body" dangerouslySetInnerHTML={{ __html: modal.bodyHTML }} />
    </div>
  );
}

function ConfirmModalContent({ modal }: { modal: ConfirmModal }) {
  return (
    <div class="help-modal">
      <div class="help-modal-header">
        <strong>{modal.title}</strong>
      </div>
      <div class="help-modal-body">
        <p style="margin-top:0">{modal.body}</p>
        <div class="confirm-modal-actions">
          <button class="btn" type="button" onClick={closeModal}>Cancel</button>
          <button
            class="btn btn-danger"
            type="button"
            onClick={() => { closeModal(); modal.onConfirm(); }}
          >
            {modal.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConflictModalContent({ modal }: { modal: ConflictModal }) {
  return (
    <div class="help-modal">
      <div class="help-modal-header">
        <strong>Sync conflict</strong>
      </div>
      <div class="help-modal-body">
        <p style="margin-top:0">
          Both your local data and the cloud have been updated independently. Which version do you want to keep?
        </p>
        <div class="conflict-versions">
          <div class="conflict-card">
            <div class="conflict-label">This device</div>
            <div class="conflict-time">
              {modal.localUpdatedAt ? relativeTime(modal.localUpdatedAt) : "No local data"}
            </div>
          </div>
          <div class="conflict-vs">vs</div>
          <div class="conflict-card">
            <div class="conflict-label">Cloud</div>
            <div class="conflict-time">
              {modal.cloudUpdatedAt ? relativeTime(modal.cloudUpdatedAt) : "No cloud data"}
            </div>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-bottom:0">
          The losing version will be permanently overwritten.
        </p>
        <div class="confirm-modal-actions">
          <button class="btn" type="button" onClick={closeModal}>Cancel</button>
          <button
            class="btn"
            type="button"
            onClick={() => { closeModal(); modal.onUseCloud(); }}
          >
            Use cloud version
          </button>
          <button
            class="btn btn-primary"
            type="button"
            onClick={() => { closeModal(); modal.onKeepLocal(); }}
          >
            Keep my local version
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal component (rendered once in App) ─────────────────────────────────

export function Modal() {
  const modal = activeModal.value;
  if (!modal) return null;

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeModal();
  };

  return (
    <div
      class="help-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      {modal.type === "help" && <HelpModalContent modal={modal} />}
      {modal.type === "confirm" && <ConfirmModalContent modal={modal} />}
      {modal.type === "conflict" && <ConflictModalContent modal={modal} />}
    </div>
  );
}
