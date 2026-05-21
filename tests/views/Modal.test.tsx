import { render, screen, fireEvent } from "@testing-library/preact";
import {
  Modal,
  openHelpModal,
  openConfirmModal,
  openConflictModal,
  closeModal,
} from "../../src/components/ui/Modal";

describe("Modal", () => {
  afterEach(() => {
    closeModal();
  });

  it("renders nothing when no modal is active", () => {
    const { container } = render(<Modal />);
    expect(container.querySelector(".help-modal-overlay")).toBeNull();
  });

  describe("help modal", () => {
    it("renders title and HTML body", () => {
      openHelpModal("My Title", "<p>Help content</p>");
      render(<Modal />);
      expect(screen.getByText("My Title")).toBeTruthy();
      expect(document.querySelector(".help-modal-body")?.innerHTML).toContain("Help content");
    });

    it("closes on ✕ button click", () => {
      openHelpModal("Title", "<p>body</p>");
      render(<Modal />);
      fireEvent.click(screen.getByLabelText("Close"));
      expect(document.querySelector(".help-modal-overlay")).toBeNull();
    });
  });

  describe("confirm modal", () => {
    it("renders title and body text", () => {
      openConfirmModal({ title: "Confirm?", body: "Are you sure?", onConfirm: vi.fn() });
      render(<Modal />);
      expect(screen.getByText("Confirm?")).toBeTruthy();
      expect(screen.getByText("Are you sure?")).toBeTruthy();
    });

    it("calls onConfirm and closes when confirm button clicked", () => {
      const onConfirm = vi.fn();
      openConfirmModal({ title: "T", body: "B", confirmLabel: "Delete", onConfirm });
      render(<Modal />);
      fireEvent.click(screen.getByText("Delete"));
      expect(onConfirm).toHaveBeenCalledOnce();
      expect(document.querySelector(".help-modal-overlay")).toBeNull();
    });

    it("closes on cancel without calling onConfirm", () => {
      const onConfirm = vi.fn();
      openConfirmModal({ title: "T", body: "B", onConfirm });
      render(<Modal />);
      fireEvent.click(screen.getByText("Cancel"));
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("conflict modal", () => {
    it("renders conflict options", () => {
      openConflictModal({
        localUpdatedAt: null,
        cloudUpdatedAt: null,
        onKeepLocal: vi.fn(),
        onUseCloud: vi.fn(),
      });
      render(<Modal />);
      expect(screen.getByText("Sync conflict")).toBeTruthy();
      expect(screen.getByText("This device")).toBeTruthy();
      expect(screen.getByText("Cloud")).toBeTruthy();
    });

    it("calls onKeepLocal when local button clicked", () => {
      const onKeepLocal = vi.fn();
      openConflictModal({ localUpdatedAt: null, cloudUpdatedAt: null, onKeepLocal, onUseCloud: vi.fn() });
      render(<Modal />);
      fireEvent.click(screen.getByText("Keep my local version"));
      expect(onKeepLocal).toHaveBeenCalledOnce();
    });

    it("calls onUseCloud when cloud button clicked", () => {
      const onUseCloud = vi.fn();
      openConflictModal({ localUpdatedAt: null, cloudUpdatedAt: null, onKeepLocal: vi.fn(), onUseCloud });
      render(<Modal />);
      fireEvent.click(screen.getByText("Use cloud version"));
      expect(onUseCloud).toHaveBeenCalledOnce();
    });
  });
});
