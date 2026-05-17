/**
 * Jest setup file – runs before all tests
 * - Mock localStorage
 * - Mock window globals
 * - Set up DOM environment
 */

// Mock localStorage using Object.defineProperty to override jsdom's implementation
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

// Replace the real localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Also set it globally for good measure
global.localStorage = localStorageMock;

// Mock Blob for export functionality
global.Blob = class {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
  }
};

// Mock File for import functionality
global.File = class extends Blob {
  constructor(parts, filename, options = {}) {
    super(parts, options);
    this.filename = filename;
    this.name = filename;
    this.lastModified = Date.now();
  }

  // Add text() method to File
  text() {
    return Promise.resolve(this.parts.join(''));
  }
};

// Mock URL.createObjectURL / revokeObjectURL
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

// Mock window.location.hash for router tests
delete window.location;
window.location = {
  hash: "",
  href: "http://localhost/",
};

// Minimal marked mock for jsdom — real rendering tested in browser
global.marked = {
  parse: (text) => `<p>${text}</p>`,
};

// Clear mocks before each test
beforeEach(() => {
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  document.body.innerHTML = "";
});
