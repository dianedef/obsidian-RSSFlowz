import { vi } from 'vitest'

// Mock de l'environnement global
global.window = {
    ...global.window,
    setInterval: vi.fn(),
    clearInterval: vi.fn(),
} as any;

// Mock du document
global.document = {
    ...global.document,
    createElement: vi.fn(),
    head: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
    }
} as any;

// Configuration des timers
vi.useFakeTimers();
vi.setSystemTime(new Date('2025-01-31'));

// Nettoyage après chaque test
afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.setSystemTime(new Date('2025-01-31'));
}); 