import React, { useState, useEffect } from "react";
import { Client } from "@hiveio/dhive";
import './Login.css';

// Configuration
const CONFIG = {
    HIVESIGNER_APP_ID: "domain-law-cases",
    REDIRECT_URI: window.location.origin + "/callback",
    HIVE_API_NODES: [
        "https://api.hive.blog",
        "https://api.hivekings.com",
        "https://api.deathwing.me",
        "https://api.pharesim.me"
    ],
    LOGIN_MESSAGE: "Login request for Domain Law Cases"
};

// Initialize dhive client with retry options
const client = new Client(CONFIG.HIVE_API_NODES, {
    timeout: 10000,
    failoverThreshold: 3
});

// Add retry function for API calls
const retryOperation = async (operation, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

export default function Login() {
    const [username, setUsername] = useState("");
    const [message, setMessage] = useState("");
    const [isKeychainAvailable, setIsKeychainAvailable] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState({
        keychain: false,
        connection: false,
        broadcast: false
    });

    // Check for Hive Keychain and blockchain connection
    useEffect(() => {
        checkKeychain();
        checkConnection();
    }, []);

    const checkKeychain = async () => {
        if (window.hive_keychain) {
            setIsKeychainAvailable(true);
            setStatus(prev => ({ ...prev, keychain: true }));
            setMessage("");
        } else {
            setIsKeychainAvailable(false);
            setMessage("Waiting for Hive Keychain...");
            setTimeout(checkKeychain, 500);
        }
    };

    const checkConnection = async () => {
        try {
            // Use retryOperation for connection check
            await retryOperation(async () => {
                const props = await client.database.getDynamicGlobalProperties();
                if (props) {
                    setStatus(prev => ({ ...prev, connection: true }));
                }
            });
        } catch (err) {
            setMessage("Error connecting to Hive blockchain: " + err.message);
        }
    };

    // Function for Hive Keychain Login
    const loginWithKeychain = async () => {
        if (!username) {
            setMessage("Please enter a username");
            return;
        }

        setIsLoading(true);

        try {
            // Use retryOperation for account verification
            const [account] = await retryOperation(async () => {
                return await client.database.getAccounts([username]);
            });
            
            if (!account) {
                setMessage("Account not found. Please check your username.");
                setIsLoading(false);
                return;
            }

            // Create a unique message to sign
            const messageToSign = `Login request for Domain Law Cases\n${new Date().toISOString()}`;

            // Request login signature with posting authority
            window.hive_keychain.requestSignBuffer(
                username,
                messageToSign,
                "Posting",
                async (response) => {
                    if (response.success) {
                        // Store login information
                        localStorage.setItem("hive_username", username);
                        localStorage.setItem("hive_auth_token", response.result);
                        localStorage.setItem("hive_auth_type", "keychain");
                        localStorage.setItem("hive_auth_expiry", new Date(Date.now() + 24*60*60*1000).toISOString());
                        
                        setMessage("Login successful! Redirecting...");
                        setTimeout(() => {
                            window.location.href = '/dashboard';
                        }, 1500);
                    } else {
                        // More specific error messages
                        if (response.message.includes("User rejected")) {
                            setMessage("Login cancelled by user");
                        } else if (response.message.includes("not found")) {
                            setMessage("Hive Keychain not found. Please install the extension.");
                        } else if (response.message.includes("wrong password")) {
                            setMessage(
                                <div>
                                    <p>Unable to unlock Hive Keychain. Please try these steps:</p>
                                    <ol style={{ textAlign: 'left', margin: '10px 0' }}>
                                        <li>Click the Hive Keychain extension icon</li>
                                        <li>Click the three dots (menu) in the top right</li>
                                        <li>Select "Settings"</li>
                                        <li>Click "Reset Keychain"</li>
                                        <li>Re-add your keys</li>
                                        <li>Try logging in again</li>
                                    </ol>
                                    <p>Or try logging in with Hivesigner instead.</p>
                                </div>
                            );
                        } else {
                            setMessage("Login failed: " + response.message);
                        }
                    }
                    setIsLoading(false);
                }
            );
        } catch (err) {
            setMessage(
                <div>
                    <p>Error: {err.message}</p>
                    <p>Try these alternatives:</p>
                    <ul style={{ textAlign: 'left', margin: '10px 0' }}>
                        <li>Use Hivesigner login instead</li>
                        <li>Reinstall Hive Keychain extension</li>
                        <li>Clear browser cache and try again</li>
                    </ul>
                </div>
            );
            setIsLoading(false);
        }
    };

    // Function for Hivesigner Login
    const loginWithHivesigner = () => {
        if (!username) {
            setMessage("Please enter a username");
            return;
        }

        const hivesignerUrl = `https://hivesigner.com/oauth2/authorize?client_id=${CONFIG.HIVESIGNER_APP_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&response_type=code&scope=login,vote,comment&state=${username}`;
        window.location.href = hivesignerUrl;
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>Legal X Suits</h1>
                <p>Your Professional Legal Case Management Platform</p>
            </div>
            
            {/* Status Indicators */}
            <div className="status-indicators">
                <div className={`status-item ${status.keychain ? 'success' : 'warning'}`}>
                    <span className="status-label">Hive Keychain</span>
                    <span className="status-value">
                        {status.keychain ? (
                            <span className="status-icon success">✓</span>
                        ) : (
                            <span className="status-icon warning">⚠</span>
                        )}
                        {status.keychain ? 'Available' : 'Not Found'}
                    </span>
                </div>
                <div className={`status-item ${status.connection ? 'success' : 'warning'}`}>
                    <span className="status-label">Blockchain Connection</span>
                    <span className="status-value">
                        {status.connection ? (
                            <span className="status-icon success">✓</span>
                        ) : (
                            <span className="status-icon warning">⚠</span>
                        )}
                        {status.connection ? 'Connected' : 'Not Connected'}
                    </span>
                </div>
            </div>

            <div className="login-form">
                <div className="input-group">
                    <label htmlFor="username">Hive Username</label>
                    <input
                        id="username"
                        type="text"
                        placeholder="Enter your Hive username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                        disabled={isLoading}
                    />
                </div>
                
                <div className="button-group">
                    <button 
                        onClick={loginWithKeychain} 
                        disabled={!isKeychainAvailable || isLoading}
                        className={`login-button keychain ${!isKeychainAvailable ? 'disabled' : ''}`}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading"></span>
                                Logging in...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-key"></i>
                                Login with Hive Keychain
                            </>
                        )}
                    </button>

                    <button 
                        onClick={loginWithHivesigner}
                        disabled={isLoading}
                        className="login-button hivesigner"
                    >
                        {isLoading ? (
                            <>
                                <span className="loading"></span>
                                Logging in...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-sign-in-alt"></i>
                                Login with Hivesigner
                            </>
                        )}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`message ${message.includes("successful") ? "success" : "error"}`}>
                    {message}
                </div>
            )}

            {!isKeychainAvailable && (
                <div className="keychain-notice">
                    <h3>Hive Keychain Required</h3>
                    <p>
                        For the best experience, please install the Hive Keychain extension.
                        This will allow you to:
                    </p>
                    <ul>
                        <li>Securely store your Hive keys</li>
                        <li>Sign transactions safely</li>
                        <li>Manage your Hive accounts</li>
                    </ul>
                    <a 
                        href="https://chrome.google.com/webstore/detail/hive-keychain/jcacnejopjdphbnjgfaaobbfafkihpep"
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="install-button"
                    >
                        <i className="fas fa-download"></i>
                        Install Hive Keychain
                    </a>
                </div>
            )}
        </div>
    );
}
