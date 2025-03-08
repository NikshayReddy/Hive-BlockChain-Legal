import { Buffer } from 'buffer';

// Initialize global process
const processPolyfill = {
    env: { NODE_DEBUG: false },
    version: '',
    nextTick: function(cb) { setTimeout(cb, 0); },
    browser: true
};

// Safe global assignments
if (typeof window !== 'undefined') {
    try {
        // Buffer polyfill
        if (!window.Buffer) {
            window.Buffer = Buffer;
        }

        // Process polyfill
        if (!window.process) {
            window.process = processPolyfill;
        }

        // Global polyfill
        if (typeof window.global === 'undefined') {
            window.global = window;
        }
    } catch (error) {
        console.warn('Polyfill initialization warning:', error);
    }
}

// Ensure global process exists
if (typeof global !== 'undefined' && !global.process) {
    global.process = processPolyfill;
}

// Export polyfills
export const polyfills = {
    Buffer,
    process: processPolyfill,
    global: typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {})
};

// Handle vm polyfill safely
try {
    const vm = require('vm-browserify');
    if (typeof window !== 'undefined' && !window.vm) {
        window.vm = vm;
    }
} catch (error) {
    console.warn('vm-browserify polyfill not loaded:', error);
} 