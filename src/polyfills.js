import { Buffer } from 'buffer';
import process from 'process';

window.Buffer = Buffer;
window.process = process;

if (typeof window.global === 'undefined') {
    window.global = window;
}

// Add ASN1.js specific polyfills
window.vm = require('vm-browserify');

// Add other necessary globals
global.Buffer = Buffer;
global.process = process;

// Ensure process.env exists
if (!process.env) {
    process.env = {};
}

process.env.NODE_DEBUG = false; 