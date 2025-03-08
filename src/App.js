import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import "./App.css";
import Login from "./components/Login";
import Blog from "./components/Blog";
import HivesignerCallback from "./components/HivesignerCallback";
import Client from "@hiveio/hive-js";
import Trials from './components/Trials';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("hive_username") && 
                         localStorage.getItem("hive_auth_token") &&
                         new Date(localStorage.getItem("hive_auth_expiry")) > new Date();
                         
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Navigation component
const Navigation = () => {
  const username = localStorage.getItem("hive_username");
  
  return (
    <nav className="app-nav">
      <div className="nav-brand">Legal X Suits</div>
      <div className="nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/trials">Trials</Link>
      </div>
      <div className="nav-user">
        {username && (
          <>
            <span>@{username}</span>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
              className="logout-button"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

// Dashboard component
const Dashboard = () => {
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [balance, setBalance] = useState(null);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalEarnings: 0,
    activeCases: 0,
    communityMembers: 0
  });
  const navigate = useNavigate();
  const username = localStorage.getItem("hive_username");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch user's HIVE balance and stats
    const fetchData = async () => {
      try {
        const client = new Client(['https://api.hive.blog', 'https://api.hivekings.com']);
        const account = await client.database.getAccounts([username]);
        if (account && account[0]) {
          setBalance({
            hive: parseFloat(account[0].balance.split(' ')[0]),
            hbd: parseFloat(account[0].hbd_balance.split(' ')[0])
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (username) {
      fetchData();
    }
  }, [username]);

  const handleTransfer = async () => {
    if (!transferAmount || !transferTo) {
      setTransferMessage('Please fill in all fields');
      return;
    }

    // Check if Hive Keychain is available
    if (!window.hive_keychain) {
      setTransferMessage('Hive Keychain is not installed. Please install it from the Chrome Web Store.');
      return;
    }

    try {
      setIsLoading(true);
      const username = localStorage.getItem('hive_username');
      
      if (!username) {
        setTransferMessage('Please log in first');
        setIsLoading(false);
        return;
      }

      const amount = parseFloat(transferAmount);
      if (amount <= 0) {
        setTransferMessage('Please enter a valid amount');
        setIsLoading(false);
        return;
      }

      // Check if user has enough balance
      if (amount > balance?.hive) {
        setTransferMessage('Insufficient HIVE balance');
        setIsLoading(false);
        return;
      }

      // Check if trying to transfer to self
      if (username === transferTo) {
        setTransferMessage('Cannot transfer to yourself');
        setIsLoading(false);
        return;
      }

      // Request signature for transfer
      const message = `Transfer ${amount} HIVE to ${transferTo}`;
      window.hive_keychain.requestSignBuffer(
        username,
        message,
        'Active',
        async (response) => {
          if (response.success) {
            const operations = [
              ['transfer', {
                from: username,
                to: transferTo,
                amount: `${amount.toFixed(3)} HIVE`,
                memo: 'Transfer from Legal X Suits'
              }]
            ];

            window.hive_keychain.requestBroadcast(
              username,
              operations,
              'active',
              response => {
                if (response.success) {
                  setTransferMessage('Transfer successful!');
                  setTransferAmount('');
                  setTransferTo('');
                  setShowTransfer(false);
                  // Refresh balance after transfer
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                } else {
                  let errorMessage = 'Transfer failed: ';
                  if (response.message.includes('User rejected')) {
                    errorMessage += 'Transaction was cancelled';
                  } else if (response.message.includes('keychain')) {
                    errorMessage += 'Hive Keychain is not unlocked. Please unlock it and try again.';
                  } else if (response.message.includes('insufficient')) {
                    errorMessage += 'Insufficient funds or power';
                  } else {
                    errorMessage += response.message;
                  }
                  setTransferMessage(errorMessage);
                }
                setIsLoading(false);
              }
            );
          } else {
            setTransferMessage('Failed to sign transfer request');
            setIsLoading(false);
          }
        }
      );
    } catch (error) {
      let errorMessage = 'Error transferring: ';
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Request timed out. Please try again.';
      } else {
        errorMessage += error.message;
      }
      setTransferMessage(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome to Legal X Suits</h1>
        <p className="dashboard-subtitle">Your Professional Legal Case Management Platform</p>
      </div>

      <div className="user-info">
        <div className="user-profile">
          <div className="profile-avatar">
            <i className="fas fa-user-circle"></i>
          </div>
          <div className="profile-details">
            <p className="username">@{username}</p>
            <p className="member-since">Member since 2024</p>
          </div>
        </div>
        {balance && (
          <div className="balance-info">
            <div className="balance-item">
              <span className="balance-label">HIVE Balance:</span>
              <span className="balance-value">{balance.hive.toFixed(3)} HIVE</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">HBD Balance:</span>
              <span className="balance-value">{balance.hbd.toFixed(3)} HBD</span>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <i className="fas fa-file-alt"></i>
          <h3>{stats.totalPosts}</h3>
          <p>Total Case Posts</p>
        </div>
        <div className="stat-card">
          <i className="fas fa-coins"></i>
          <h3>{stats.totalEarnings} HIVE</h3>
          <p>Total Earnings</p>
        </div>
        <div className="stat-card">
          <i className="fas fa-gavel"></i>
          <h3>{stats.activeCases}</h3>
          <p>Active Cases</p>
        </div>
        <div className="stat-card">
          <i className="fas fa-users"></i>
          <h3>{stats.communityMembers}</h3>
          <p>Community Members</p>
        </div>
      </div>

      <div className="dashboard-actions">
        <button 
          className="action-button create-post"
          onClick={() => navigate('/blog')}
        >
          <i className="fas fa-plus"></i>
          Create New Case
        </button>
        <button 
          className="action-button transfer-hive"
          onClick={() => setShowTransfer(!showTransfer)}
        >
          <i className="fas fa-exchange-alt"></i>
          Transfer HIVE
        </button>
        <button 
          className="action-button premium"
          onClick={() => navigate('/premium')}
        >
          <i className="fas fa-crown"></i>
          Upgrade to Premium
        </button>
      </div>

      {showTransfer && (
        <div className="transfer-form">
          <h3>Transfer HIVE</h3>
          <div className="form-group">
            <label>Recipient Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Amount (Available: {balance?.hive.toFixed(3)} HIVE)</label>
            <input
              type="number"
              placeholder="Enter amount"
              min="0.001"
              step="0.001"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
          </div>
          <button 
            className="transfer-submit"
            onClick={handleTransfer}
            disabled={!transferAmount || !transferTo || parseFloat(transferAmount) > (balance?.hive || 0)}
          >
            Send HIVE
          </button>
          {transferMessage && (
            <div className={`transfer-message ${transferMessage.includes('successful') ? 'success' : 'error'}`}>
              {transferMessage}
            </div>
          )}
        </div>
      )}

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <i className="fas fa-book card-icon"></i>
          <h3>Case Management</h3>
          <p>Create and manage your legal case posts. Share your expertise with the community.</p>
          <Link to="/blog" className="dashboard-link">Go to Cases</Link>
        </div>
        <div className="dashboard-card">
          <i className="fas fa-gavel card-icon"></i>
          <h3>Legal Resources</h3>
          <p>Access premium legal templates, guidelines, and best practices for case documentation.</p>
          <Link to="/resources" className="dashboard-link">View Resources</Link>
        </div>
        <div className="dashboard-card">
          <i className="fas fa-chart-line card-icon"></i>
          <h3>Analytics</h3>
          <p>Track your case performance, earnings, and community engagement metrics.</p>
          <Link to="/analytics" className="dashboard-link">View Analytics</Link>
        </div>
        <div className="dashboard-card premium">
          <i className="fas fa-crown card-icon"></i>
          <h3>Premium Features</h3>
          <p>Unlock advanced features, priority support, and exclusive legal resources.</p>
          <Link to="/premium" className="dashboard-link">Upgrade Now</Link>
        </div>
      </div>

      <div className="revenue-section">
        <h2>Revenue Opportunities</h2>
        <div className="revenue-grid">
          <div className="revenue-card">
            <i className="fas fa-hand-holding-usd"></i>
            <h3>Case Rewards</h3>
            <p>Earn HIVE rewards for quality case documentation and analysis</p>
          </div>
          <div className="revenue-card">
            <i className="fas fa-star"></i>
            <h3>Expert Status</h3>
            <p>Build reputation and earn premium consulting fees</p>
          </div>
          <div className="revenue-card">
            <i className="fas fa-book-reader"></i>
            <h3>Resource Sales</h3>
            <p>Monetize your legal expertise through premium content</p>
          </div>
          <div className="revenue-card">
            <i className="fas fa-users"></i>
            <h3>Community Growth</h3>
            <p>Grow your network and increase earning potential</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/blog" element={
            <ProtectedRoute>
              <Blog />
            </ProtectedRoute>
          } />
          <Route path="/trials" element={
            <ProtectedRoute>
              <Trials />
            </ProtectedRoute>
          } />
          <Route path="/hivesigner/callback" element={<HivesignerCallback />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
