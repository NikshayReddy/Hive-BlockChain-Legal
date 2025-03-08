import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HivesignerCallback() {
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // The Login component will handle the actual callback logic
        // This component just shows a loading state and handles errors
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
            setError(`${error}: ${errorDescription}`);
        }
    }, []);

    if (error) {
        return (
            <div style={{
                padding: "20px",
                maxWidth: "600px",
                margin: "50px auto",
                textAlign: "center"
            }}>
                <h2>Authentication Error</h2>
                <p style={{
                    color: "#721c24",
                    backgroundColor: "#f8d7da",
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px solid #f5c6cb"
                }}>
                    {error}
                </p>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        marginTop: "20px"
                    }}
                >
                    Return to Login
                </button>
            </div>
        );
    }

    return (
        <div style={{
            padding: "20px",
            maxWidth: "600px",
            margin: "50px auto",
            textAlign: "center"
        }}>
            <h2>Processing Login</h2>
            <p>Please wait while we complete your authentication...</p>
            <div style={{
                width: "50px",
                height: "50px",
                margin: "20px auto",
                border: "5px solid #f3f3f3",
                borderTop: "5px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
            }} />
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
} 