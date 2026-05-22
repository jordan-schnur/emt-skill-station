import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";
import { describe, it, expect, vi } from "vitest";

const { mockNavigate, mockRoute, MOCK_SHEET_WITH_VIDEOS } = vi.hoisted(() => {
  const { signal } = require("@preact/signals");
  const withVideos = {
    id: "e201",
    title: "Trauma Assessment",
    shortTitle: "Trauma",
    category: "Trauma",
    totalPoints: 48,
    sections: [],
    criticalCriteria: [],
    cards: [],
    videos: [
      {
        videoId: "abc123",
        title: "EMT Skills: Trauma Patient Assessment",
        channel: "EMTprep",
        url: "https://www.youtube.com/watch?v=abc123",
      },
      {
        videoId: "xyz789",
        title: "NREMT Trauma Demo",
        channel: "Rallypoint EMS",
        duration: "8:24",
        url: "https://www.youtube.com/watch?v=xyz789",
      },
    ],
  };
  return {
    mockNavigate: vi.fn(),
    mockRoute: signal({ view: "sheet", sheetId: "e201", tab: "sheet" }),
    MOCK_SHEET_WITH_VIDEOS: withVideos,
  };
});

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  return {
    appState: signal(storage.createEmptyState()),
    route: mockRoute,
    navigate: mockNavigate,
    save: vi.fn(),
    showToast: vi.fn(),
    mutateState: vi.fn(),
  };
});

import { VideoCard } from "../../src/components/VideoCard";
import type { Video } from "../../src/types";

const MOCK_VIDEO: Video = {
  videoId: "abc123",
  title: "EMT Skills: Trauma Patient Assessment",
  channel: "EMTprep",
  url: "https://www.youtube.com/watch?v=abc123",
};

const MOCK_VIDEO_WITH_DURATION: Video = {
  ...MOCK_VIDEO,
  videoId: "xyz789",
  duration: "8:24",
  url: "https://www.youtube.com/watch?v=xyz789",
};

describe("VideoCard", () => {
  it("renders a YouTube fallback link with correct href", () => {
    render(<VideoCard video={MOCK_VIDEO} />);
    const link = screen.getByRole("link");
    expect((link as HTMLAnchorElement).href).toContain("youtube.com/watch?v=abc123");
  });

  it("fallback link opens in a new tab with rel=noopener noreferrer", () => {
    render(<VideoCard video={MOCK_VIDEO} />);
    const link = screen.getByRole("link") as HTMLAnchorElement;
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noopener");
    expect(link.rel).toContain("noreferrer");
  });

  it("renders thumbnail with correct src before playing", () => {
    render(<VideoCard video={MOCK_VIDEO} />);
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.src).toContain("img.youtube.com/vi/abc123/mqdefault.jpg");
  });

  it("renders video title", () => {
    render(<VideoCard video={MOCK_VIDEO} />);
    expect(screen.getByText("EMT Skills: Trauma Patient Assessment")).toBeTruthy();
  });

  it("renders channel name", () => {
    render(<VideoCard video={MOCK_VIDEO} />);
    expect(screen.getByText(/EMTprep/)).toBeTruthy();
  });

  it("renders duration when present", () => {
    render(<VideoCard video={MOCK_VIDEO_WITH_DURATION} />);
    expect(screen.getByText(/8:24/)).toBeTruthy();
  });

  it("renders YouTube fallback link label", () => {
    render(<VideoCard video={MOCK_VIDEO} />);
    expect(screen.getByText(/↗ YouTube/)).toBeTruthy();
  });

  it("shows fallback div when image errors", () => {
    render(<VideoCard video={MOCK_VIDEO} />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(document.querySelector(".video-card-thumb-fallback")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("clicking play button replaces thumbnail with iframe embed", () => {
    render(<VideoCard video={MOCK_VIDEO} />);
    const playBtn = screen.getByRole("button", { name: /Play EMT Skills/ });
    fireEvent.click(playBtn);
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.src).toContain("youtube.com/embed/abc123");
    expect(screen.queryByRole("img")).toBeNull();
  });
});
