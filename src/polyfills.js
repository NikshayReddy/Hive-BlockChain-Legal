import { Buffer } from 'buffer';
import process from 'process';

if (typeof window !== 'undefined') {
    // Safely assign Buffer
    if (!window.Buffer) {
        window.Buffer = Buffer;
    }

    // Safely assign process
    if (!window.process) {
        window.process = process;
    }

    // Safely assign global
    if (typeof window.global === 'undefined') {
        window.global = window;
    }
}

// Ensure process.env exists and has required properties
if (!process.env) {
    process.env = {};
}

// Set default values for required environment variables
process.env.NODE_DEBUG = process.env.NODE_DEBUG || false;

// Handle vm polyfill safely
try {
    const vm = require('vm-browserify');
    if (typeof window !== 'undefined' && !window.vm) {
        window.vm = vm;
    }
} catch (error) {
    console.warn('vm-browserify polyfill not loaded:', error);
}

// Export for use in other files
export const polyfills = {
    Buffer,
    process,
    global: typeof window !== 'undefined' ? window : global
}; 