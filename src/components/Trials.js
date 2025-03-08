import React, { useState, useEffect } from 'react';
import { Client } from '@hiveio/dhive';
import './Trials.css';

const client = new Client([
    'https://api.hive.blog',
    'https://api.hivekings.com',
    'https://api.deathwing.me',
    'https://api.pharesim.me'
]);

const Trials = () => {
    const [trialCases, setTrialCases] = useState([]);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [premiumAmount] = useState(1); // Premium subscription amount in HIVE
    const [username, setUsername] = useState('');
    const [userBalance, setUserBalance] = useState('0.000');

    useEffect(() => {
        fetchTrialCases();
        const loggedInUser = localStorage.getItem('hive_username');
        if (loggedInUser) {
            setUsername(loggedInUser);
            fetchUserBalance(loggedInUser);
        }
    }, []);

    const fetchUserBalance = async (username) => {
        try {
            const accounts = await client.database.getAccounts([username]);
            if (accounts && accounts[0]) {
                setUserBalance(accounts[0].balance);
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    const fetchTrialCases = async () => {
        try {
            setLoading(true);
            // Fetch trial cases with the 'trial' tag
            const query = {
                tag: 'trial',
                limit: 10
            };
            const result = await client.database.getDiscussions('created', query);
            setTrialCases(result);
        } catch (error) {
            console.error('Error fetching trial cases:', error);
            setMessage('Failed to load trial cases');
        } finally {
            setLoading(false);
        }
    };

    const handlePremiumSubscription = async () => {
        if (!window.hive_keychain) {
            setMessage('Please install Hive Keychain');
            return;
        }

        if (!username) {
            setMessage('Please enter your username');
            return;
        }

        try {
            setLoading(true);
            const balance = await fetchUserBalance(username);
            const balanceAmount = parseFloat(balance?.split(' ')[0] || '0');

            if (balanceAmount < premiumAmount) {
                setMessage(`Insufficient balance. You need ${premiumAmount} HIVE for premium subscription`);
                return;
            }

            const operations = [
                ['transfer', {
                    from: username,
                    to: 'admin', // Replace with your admin account
                    amount: `${premiumAmount.toFixed(3)} HIVE`,
                    memo: 'Premium subscription payment'
                }]
            ];

            window.hive_keychain.requestBroadcast(
                username,
                operations,
                'active',
                response => {
                    if (response.success) {
                        localStorage.setItem('premium_user', 'true');
                        setMessage('Premium subscription activated successfully!');
                        setShowPremiumModal(false);
                    } else {
                        setMessage('Failed to process premium subscription');
                    }
                    setLoading(false);
                }
            );
        } catch (error) {
            console.error('Error processing premium subscription:', error);
            setMessage('Failed to process premium subscription');
            setLoading(false);
        }
    };

    const handleTryCase = async (caseId, trialFee) => {
        if (!window.hive_keychain) {
            setMessage('Please install Hive Keychain');
            return;
        }

        const loggedInUser = localStorage.getItem('hive_username');
        if (!loggedInUser) {
            setMessage('Please log in first');
            return;
        }

        try {
            setLoading(true);
            const balance = await fetchUserBalance(loggedInUser);
            const balanceAmount = parseFloat(balance?.split(' ')[0] || '0');

            if (balanceAmount < trialFee) {
                setMessage(`Insufficient balance. You need ${trialFee} HIVE to try this case`);
                return;
            }

            const operations = [
                ['transfer', {
                    from: loggedInUser,
                    to: 'admin', // Replace with your admin account
                    amount: `${trialFee.toFixed(3)} HIVE`,
                    memo: `Trial fee for case ${caseId}`
                }]
            ];

            window.hive_keychain.requestBroadcast(
                loggedInUser,
                operations,
                'active',
                response => {
                    if (response.success) {
                        setMessage('Trial access granted successfully!');
                        // Add logic to grant access to the case
                    } else {
                        setMessage('Failed to process trial payment');
                    }
                    setLoading(false);
                }
            );
        } catch (error) {
            console.error('Error processing trial payment:', error);
            setMessage('Failed to process trial payment');
            setLoading(false);
        }
    };

    return (
        <div className="trials-container">
            <div className="trials-header">
                <h1>Legal X Suits - Trial Cases</h1>
                <p>Practice with real legal cases or get unlimited access with premium</p>
                <button 
                    className="premium-subscribe-button"
                    onClick={() => setShowPremiumModal(true)}
                >
                    Get Premium Access
                </button>
            </div>

            <div className="trials-grid">
                {trialCases.map(trialCase => (
                    <div key={trialCase.id} className="trial-card">
                        <h3>{trialCase.title}</h3>
                        <p>{trialCase.body.substring(0, 150)}...</p>
                        <div className="trial-meta">
                            <span>Trial Fee: 5 HIVE</span>
                            <button 
                                onClick={() => handleTryCase(trialCase.id, 5)}
                                disabled={loading}
                            >
                                Try This Case
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showPremiumModal && (
                <div className="premium-modal">
                    <div className="modal-content">
                        <h2>Premium Subscription</h2>
                        <p>Get unlimited access to all trial cases for {premiumAmount} HIVE</p>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your Hive username"
                            />
                        </div>
                        <div className="modal-actions">
                            <button 
                                className="cancel-button"
                                onClick={() => setShowPremiumModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="subscribe-button"
                                onClick={handlePremiumSubscription}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Subscribe Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {message && (
                <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default Trials; 