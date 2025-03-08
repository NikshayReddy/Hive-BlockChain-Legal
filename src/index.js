import { polyfills } from './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Initialize global polyfills
if (typeof window !== 'undefined') {
    window.Buffer = polyfills.Buffer;
    window.process = polyfills.process;
    window.global = polyfills.global;
}

// Error boundary for development
const renderApp = () => {
    try {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );

        // Report web vitals
        reportWebVitals();
    } catch (error) {
        console.error('Application initialization error:', error);
        // Render error message to DOM
        document.getElementById('root').innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h1>Something went wrong</h1>
                <p>Please try refreshing the page. If the problem persists, contact support.</p>
            </div>
        `;
    }
};

// Ensure DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderApp);
} else {
    renderApp();
}
