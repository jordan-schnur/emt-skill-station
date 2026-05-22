import "@testing-library/jest-dom";
import { vi, beforeEach } from "vitest";

// Use a real (but clean) jsdom localStorage — clear it before each test.
// Vitest's jsdom provides a functional localStorage, so we don't need a mock.

// Mock URL.createObjectURL / revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock window.location for router tests
Object.defineProperty(window, "location", {
  value: { hash: "", href: "http://localhost/", pathname: "/", search: "" },
  writable: true,
});

// Minimal marked mock — real rendering tested in browser
(global as unknown as Record<string, unknown>)["marked"] = {
  parse: (text: string) => `<p>${text}</p>`,
};

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  vi.clearAllMocks();
});
