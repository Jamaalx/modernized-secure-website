// src/test/setup.ts - Frontend Test Setup - 2025 Modernized
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Extend Vitest's expect with jest-dom matchers
expect.extend({});

// Global test setup
beforeAll(() => {
  // Set up global test environment
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock scrollTo
  global.scrollTo = vi.fn();

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  });

  // Mock URL.createObjectURL
  global.URL.createObjectURL = vi.fn(() => 'mocked-url');
  global.URL.revokeObjectURL = vi.fn();

  // Mock File and FileReader
  global.File = class MockFile {
    constructor(
      public chunks: BlobPart[],
      public name: string,
      public options?: FilePropertyBag
    ) {}
    
    get size() { return 1024; }
    get type() { return this.options?.type || 'text/plain'; }
    get lastModified() { return Date.now(); }
    
    arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    text = vi.fn().mockResolvedValue('file content');
    stream = vi.fn();
    slice = vi.fn();
  } as any;

  global.FileReader = class MockFileReader {
    result: string | ArrayBuffer | null = null;
    error: DOMException | null = null;
    readyState: number = 0;
    onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

    readAsText = vi.fn().mockImplementation(() => {
      this.result = 'file content';
      this.onload?.({} as ProgressEvent<FileReader>);
    });
    
    readAsDataURL = vi.fn().mockImplementation(() => {
      this.result = 'data:text/plain;base64,ZmlsZSBjb250ZW50';
      this.onload?.({} as ProgressEvent<FileReader>);
    });
    
    readAsArrayBuffer = vi.fn().mockImplementation(() => {
      this.result = new ArrayBuffer(8);
      this.onload?.({} as ProgressEvent<FileReader>);
    });
    
    abort = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    dispatchEvent = vi.fn();
  } as any;

  // Mock Clipboard API
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
      write: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue([]),
    },
  });

  // Mock geolocation
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
      }),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
  });

  // Mock fetch if not available
  if (!global.fetch) {
    global.fetch = vi.fn();
  }

  // Mock console methods for cleaner test output
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Suppress React error boundary errors in tests
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Error: Uncaught [Error: ')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
});

// Global cleanup
afterAll(() => {
  vi.restoreAllMocks();
});

// Test utilities
export const testUtils = {
  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Create mock document
  createMockDocument: (overrides = {}) => ({
    id: '1',
    title: 'Test Document',
    description: 'Test document description',
    filename: 'test-document.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    category: 'GENERAL',
    uploadedBy: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Create mock API response
  createMockApiResponse: <T>(data: T, overrides = {}) => ({
    success: true,
    data,
    message: 'Success',
    timestamp: new Date().toISOString(),
    ...overrides,
  }),

  // Create mock error response
  createMockErrorResponse: (message = 'Test error', overrides = {}) => ({
    success: false,
    message,
    code: 'TEST_ERROR',
    timestamp: new Date().toISOString(),
    ...overrides,
  }),

  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock file for testing
  createMockFile: (
    name = 'test.txt',
    content = 'test content',
    type = 'text/plain'
  ) => {
    const blob = new Blob([content], { type });
    return new File([blob], name, { type });
  },

  // Mock image file
  createMockImageFile: (name = 'test.jpg') => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        }
      }, 'image/jpeg');
    });
  },

  // Mock drag and drop event
  createMockDragEvent: (files: File[] = []) => ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: {
      files,
      items: files.map(file => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file,
      })),
      types: ['Files'],
    },
  }),

  // Mock form data
  createMockFormData: (data: Record<string, any> = {}) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else {
        formData.append(key, String(value));
      }
    });
    return formData;
  },
};

// Export commonly used testing utilities
export { vi, expect } from 'vitest';
export {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  getByRole,
  getByText,
  getByLabelText,
  getByTestId,
  queryByRole,
  queryByText,
  queryByLabelText,
  queryByTestId,
  findByRole,
  findByText,
  findByLabelText,
  findByTestId,
} from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Custom render function with providers
export { default as renderWithProviders } from './render-with-providers';

// Mock data
export { default as mockData } from './mock-data';

// Test constants
export const TEST_IDS = {
  // Navigation
  MAIN_NAV: 'main-navigation',
  USER_MENU: 'user-menu',
  MOBILE_MENU: 'mobile-menu',
  
  // Forms
  LOGIN_FORM: 'login-form',
  REGISTER_FORM: 'register-form',
  UPLOAD_FORM: 'upload-form',
  
  // Components
  DOCUMENT_LIST: 'document-list',
  DOCUMENT_CARD: 'document-card',
  FILE_DROPZONE: 'file-dropzone',
  LOADING_SPINNER: 'loading-spinner',
  ERROR_MESSAGE: 'error-message',
  SUCCESS_MESSAGE: 'success-message',
  
  // Buttons
  SUBMIT_BUTTON: 'submit-button',
  CANCEL_BUTTON: 'cancel-button',
  DELETE_BUTTON: 'delete-button',
  DOWNLOAD_BUTTON: 'download-button',
  
  // Modals
  CONFIRM_MODAL: 'confirm-modal',
  UPLOAD_MODAL: 'upload-modal',
  SETTINGS_MODAL: 'settings-modal',
} as const;

