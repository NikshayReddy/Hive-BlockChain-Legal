import { Buffer } from 'buffer';

window.Buffer = Buffer;
window.process = {
    env: { NODE_DEBUG: undefined },
    version: '',
    nextTick: function(cb) { setTimeout(cb, 0); }
};

if (typeof window.global === 'undefined') {
    window.global = window;
} 