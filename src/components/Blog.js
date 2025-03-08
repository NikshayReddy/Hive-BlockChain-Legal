import React, { useState, useEffect } from 'react';
import { Client } from '@hiveio/dhive';
import { useNavigate } from 'react-router-dom';
import './Blog.css';

// Initialize client with default Hive settings
const client = new Client([
    'https://api.hive.blog',
    'https://api.hivekings.com',
    'https://api.deathwing.me',
    'https://api.pharesim.me'
], {
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

const Blog = () => {
    const [newPost, setNewPost] = useState({ 
        title: '', 
        content: '', 
        tags: '', 
        category: 'legal' 
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [posts, setPosts] = useState([]);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [showCaseDetails, setShowCaseDetails] = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [message, setMessage] = useState('');
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [showPremiumBanner, setShowPremiumBanner] = useState(true);
    const [donateAmount, setDonateAmount] = useState('');
    const [showDonateModal, setShowDonateModal] = useState(null);
    const [voteWeight, setVoteWeight] = useState(10000);
    const [showVoteSlider, setShowVoteSlider] = useState(false);
    const [selectedPostForVote, setSelectedPostForVote] = useState(null);
    const navigate = useNavigate();
    const [username, setUsername] = useState(localStorage.getItem("hive_username"));
    const [userData, setUserData] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        hasMore: true
    });
    const [userBalance, setUserBalance] = useState('0.000');
    const [showBalanceMessage, setShowBalanceMessage] = useState(false);
    const [balanceMessage, setBalanceMessage] = useState('');

    // Function to create a valid permlink
    const createPermlink = (title) => {
        if (!title) return 'post';
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-')
            || 'post';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewPost(prev => ({
            ...prev,
            [name]: value
        }));
    };

    useEffect(() => {
        checkLoginStatus();
        fetchPosts();
    }, []);

    // Function to check login status
    const checkLoginStatus = async () => {
        const username = localStorage.getItem('hive_username');
        if (username) {
            try {
                const accounts = await client.database.getAccounts([username]);
                if (accounts && accounts[0]) {
                    setUserData(accounts[0]);
                    setIsLoggedIn(true);
                } else {
                    handleLogout();
                }
            } catch (error) {
                console.error('Error checking login status:', error);
                handleLogout();
            }
        }
    };

    // Function to handle login
    const handleLogin = async () => {
        if (!window.hive_keychain) {
            setMessage('Hive Keychain is not installed. Please install it from the Chrome Web Store.');
            return;
        }

        try {
            setLoading(true);
            // Request login from Hive Keychain
            window.hive_keychain.requestSignBuffer(
                '',
                'Login to Legal X Suits',
                'Posting',
                async (response) => {
                    if (response.success) {
                        const username = response.data.username;
                        localStorage.setItem('hive_username', username);
                        
                        // Fetch user data
                        const accounts = await client.database.getAccounts([username]);
                        if (accounts && accounts[0]) {
                            setUserData(accounts[0]);
                            setIsLoggedIn(true);
                            setMessage('Login successful!');
                        }
                    } else {
                        setMessage('Login failed: ' + (response.message || 'Unknown error'));
                    }
                    setLoading(false);
                }
            );
        } catch (error) {
            console.error('Login error:', error);
            setMessage('Login failed: ' + (error.message || 'Unknown error'));
            setLoading(false);
        }
    };

    // Function to handle logout
    const handleLogout = () => {
        localStorage.removeItem('hive_username');
        setUserData(null);
        setIsLoggedIn(false);
        setMessage('Logged out successfully');
    };

    // Optimized fetchPosts function
    const fetchPosts = async (pageNum = 1) => {
        try {
            setLoading(true);
            setError(null);

            // Build query based on pagination
            const query = {
                tag: 'law',
                limit: 10,
                start_author: pageNum > 1 ? posts[posts.length - 1]?.author : undefined,
                start_permlink: pageNum > 1 ? posts[posts.length - 1]?.permlink : undefined
            };

            // Fetch posts from blockchain
            const result = await client.database.getDiscussions('created', query);

            if (Array.isArray(result)) {
                // Fetch additional data for each post in parallel
                const enhancedPosts = await Promise.all(result.map(async (post) => {
                    try {
                        // Get post stats
                        const stats = await client.database.getContentStats(post.author, post.permlink);
                        
                        // Get post votes
                        const votes = await client.database.getActiveVotes(post.author, post.permlink);
                        
                        // Get post rewards
                        const rewards = await client.database.getContentReplies(post.author, post.permlink);
                        
                        // Calculate total earnings
                        const totalEarnings = rewards?.reduce((sum, reply) => {
                            const pendingPayout = parseFloat(reply.pending_payout_value?.split(' ')[0] || '0');
                            return sum + pendingPayout;
                        }, 0) || 0;

                        return {
                            ...post,
                            stats: {
                                views: stats?.views || 0,
                                votes: votes?.length || 0,
                                earnings: totalEarnings.toFixed(3),
                                voteWeight: votes?.reduce((sum, vote) => sum + (vote.percent / 100), 0) || 0
                            },
                            metadata: {
                                ...JSON.parse(post.json_metadata || '{}'),
                                tags: post.tags || []
                            }
                        };
                    } catch (error) {
                        console.error(`Error fetching details for post ${post.permlink}:`, error);
                        // Return post with default values if data fetch fails
                        return {
                            ...post,
                            stats: {
                                views: 0,
                                votes: 0,
                                earnings: '0.000',
                                voteWeight: 0
                            },
                            metadata: {
                                ...JSON.parse(post.json_metadata || '{}'),
                                tags: post.tags || []
                            }
                        };
                    }
                }));

                // Update posts state based on pagination
                if (pageNum === 1) {
                    setPosts(enhancedPosts);
                } else {
                    setPosts(prev => [...prev, ...enhancedPosts]);
                }

                // Update pagination state
                setPagination(prev => ({
                    ...prev,
                    currentPage: pageNum,
                    totalPages: Math.ceil(result.length / 10),
                    hasMore: result.length === 10
                }));
            } else {
                setError('Failed to fetch posts: Invalid response format');
                setPosts([]);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
            setError(error.message || 'Failed to fetch posts');
            if (pagination.currentPage === 1) {
                setPosts([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Add scroll handler for infinite loading
    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + document.documentElement.scrollTop
                === document.documentElement.offsetHeight
            ) {
                if (pagination.hasMore && !loading) {
                    fetchPosts(pagination.currentPage + 1);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [pagination.hasMore, loading, pagination.currentPage]);

    // Enhanced createPost function
    const createPost = async (e) => {
        e.preventDefault();
        if (!isLoggedIn) {
            setError('Please login first');
            setMessage('Please login first');
            return;
        }

        if (!newPost.title || !newPost.content) {
            setError('Please fill in all required fields');
            setMessage('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            const permlink = createPermlink(newPost.title);

            // Create the post operation
            const operations = [
                ['comment',
                    {
                        parent_author: '',
                        parent_permlink: 'law',
                        author: userData.name,
                        permlink: permlink,
                        title: newPost.title,
                        body: newPost.content,
                        json_metadata: JSON.stringify({
                            tags: ['law', 'legal', ...newPost.tags.split(',').map(tag => tag.trim()).filter(tag => tag)],
                            category: newPost.category,
                            app: 'legal-x-suits'
                        })
                    }
                ]
            ];

            // Request signature and broadcast with retry logic
            const broadcastWithRetry = async (retries = 3) => {
                return new Promise((resolve, reject) => {
                    window.hive_keychain.requestSignBuffer(
                        userData.name,
                        `Create new case: ${newPost.title}`,
                        'Posting',
                        async (response) => {
                            if (response.success) {
                                window.hive_keychain.requestBroadcast(
                                    userData.name,
                                    operations,
                                    'posting',
                                    async (broadcastResponse) => {
                                        if (broadcastResponse.success) {
                                            // Wait for transaction to be confirmed
                                            try {
                                                await new Promise(resolve => setTimeout(resolve, 2000));
                                                const result = await client.database.getContent(userData.name, permlink);
                                                if (result) {
                                                    resolve(broadcastResponse);
                                                } else {
                                                    if (retries > 0) {
                                                        setTimeout(() => {
                                                            broadcastWithRetry(retries - 1)
                                                                .then(resolve)
                                                                .catch(reject);
                                                        }, 2000);
                                                    } else {
                                                        reject(new Error('Transaction not confirmed after multiple attempts'));
                                                    }
                                                }
                                            } catch (error) {
                                                if (retries > 0) {
                                                    setTimeout(() => {
                                                        broadcastWithRetry(retries - 1)
                                                            .then(resolve)
                                                            .catch(reject);
                                                    }, 2000);
                                                } else {
                                                    reject(error);
                                                }
                                            }
                                        } else {
                                            reject(new Error(broadcastResponse.message || 'Broadcast failed'));
                                        }
                                    }
                                );
                            } else {
                                reject(new Error(response.message || 'Failed to sign'));
                            }
                        }
                    );
                });
            };

            await broadcastWithRetry();
            setMessage('Post created successfully!');
            setShowCreatePost(false);
            setNewPost({ title: '', content: '', tags: '', category: 'legal' });
            fetchPosts();
        } catch (err) {
            console.error('Error creating post:', err);
            let errorMessage = 'Error creating post: ';
            if (err.message.includes('Failed to fetch')) {
                errorMessage += 'Network error. Please check your connection and try again.';
            } else if (err.message.includes('timeout')) {
                errorMessage += 'Request timed out. Please try again.';
            } else if (err.message.includes('posting')) {
                errorMessage += 'Posting key is not available. Please check your Hive Keychain permissions.';
            } else {
                errorMessage += err.message || 'Unknown error';
            }
            setError(errorMessage);
            setMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (post) => {
        if (!window.hive_keychain) {
            setMessage('Hive Keychain is not installed. Please install it from the Chrome Web Store.');
            return;
        }

        try {
            setLoading(true);
            const username = localStorage.getItem('hive_username');
            
            if (!username) {
                setMessage('Please log in first');
                setLoading(false);
                return;
            }

            const operations = [
                ['vote', {
                    voter: username,
                    author: post.author,
                    permlink: post.permlink,
                    weight: voteWeight
                }]
            ];

            // Use retryOperation for broadcasting
            await retryOperation(() => {
                return new Promise((resolve, reject) => {
                    window.hive_keychain.requestBroadcast(
                        username,
                        operations,
                        'posting',
                        async (response) => {
                            if (response.success) {
                                // Wait for transaction to be confirmed
                                try {
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    const result = await client.database.getContent(post.author, post.permlink);
                                    if (result) {
                                        setMessage('Vote successful!');
                                        setShowVoteSlider(false);
                                        setSelectedPostForVote(null);
                                        fetchPosts(); // Refresh posts to show updated vote count
                                        resolve();
                                    } else {
                                        reject(new Error('Transaction not confirmed'));
                                    }
                                } catch (error) {
                                    reject(error);
                                }
                            } else {
                                reject(new Error(response.message || 'Broadcast failed'));
                            }
                            setLoading(false);
                        }
                    );
                });
            });
        } catch (error) {
            console.error('Error voting:', error);
            let errorMessage = 'Error voting: ';
            if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('timeout')) {
                errorMessage += 'Request timed out. Please try again.';
            } else if (error.message.includes('posting')) {
                errorMessage += 'Posting key is not available. Please check your Hive Keychain permissions.';
            } else {
                errorMessage += error.message;
            }
            setMessage(errorMessage);
            setLoading(false);
        }
    };

    // Add this function to fetch user balance
    const fetchUserBalance = async (username) => {
        try {
            const accounts = await client.database.getAccounts([username]);
            if (accounts && accounts[0]) {
                const balance = accounts[0].balance;
                setUserBalance(balance);
                return balance;
            }
            return '0.000';
        } catch (error) {
            console.error('Error fetching balance:', error);
            return '0.000';
        }
    };

    // Update handleDonate function
    const handleDonate = async (post) => {
        if (!window.hive_keychain) {
            setMessage('Hive Keychain is not installed. Please install it from the Chrome Web Store.');
            setShowDonateModal(null);
            return;
        }

        const username = localStorage.getItem('hive_username');
        if (!username) {
            setMessage('Please log in first');
            setShowDonateModal(null);
            return;
        }

        if (!donateAmount || parseFloat(donateAmount) <= 0) {
            setMessage('Please enter a valid amount');
            return;
        }

        try {
            setLoading(true);
            const amount = parseFloat(donateAmount);

            // Check if trying to donate to self
            if (username === post.author) {
                setMessage('Cannot donate to your own case');
                setLoading(false);
                return;
            }

            // Check balance first
            const balance = await fetchUserBalance(username);
            const balanceAmount = parseFloat(balance.split(' ')[0]);
            
            if (balanceAmount < amount) {
                setBalanceMessage(`Insufficient balance. Your current balance is ${balance}`);
                setShowBalanceMessage(true);
                setLoading(false);
                return;
            }

            const operations = [
                ['transfer', {
                    from: username,
                    to: post.author,
                    amount: `${amount.toFixed(3)} HIVE`,
                    memo: `Donation for case: ${post.title}`
                }]
            ];

            // Use retryOperation for broadcasting
            await retryOperation(() => {
                return new Promise((resolve, reject) => {
                    window.hive_keychain.requestBroadcast(
                        username,
                        operations,
                        'active',
                        async (response) => {
                            if (response.success) {
                                // Wait for transaction to be confirmed
                                try {
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    const result = await client.database.getAccounts([username]);
                                    if (result) {
                                        setMessage('Donation successful!');
                                        setDonateAmount('');
                                        setShowDonateModal(null);
                                        // Update balance after successful donation
                                        await fetchUserBalance(username);
                                        resolve();
                                    } else {
                                        reject(new Error('Transaction not confirmed'));
                                    }
                                } catch (error) {
                                    reject(error);
                                }
                            } else {
                                reject(new Error(response.message || 'Broadcast failed'));
                            }
                            setLoading(false);
                        }
                    );
                });
            });
        } catch (error) {
            console.error('Error donating:', error);
            let errorMessage = 'Error donating: ';
            if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('timeout')) {
                errorMessage += 'Request timed out. Please try again.';
            } else if (error.message.includes('active')) {
                errorMessage += 'Active key is not available. Please check your Hive Keychain permissions.';
            } else {
                errorMessage += error.message;
            }
            setMessage(errorMessage);
            setLoading(false);
        }
    };

    // Add useEffect to fetch balance when component mounts or user logs in
    useEffect(() => {
        const username = localStorage.getItem('hive_username');
        if (username) {
            fetchUserBalance(username);
        }
    }, [isLoggedIn]);

    const openCaseDetails = (post) => {
        setSelectedCase(post);
        setShowCaseDetails(true);
    };

    return (
        <div className="blog-container">
            <div className="blog-header">
                <h1>Legal Case Documentation</h1>
                <p className="blog-subtitle">Share and monetize your legal expertise</p>
                {!isLoggedIn ? (
                    <button 
                        className="login-button"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="loading"></span>
                                Logging in...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-sign-in-alt"></i>
                                Login with Hive Keychain
                            </>
                        )}
                    </button>
                ) : (
                    <div className="user-info">
                        <span>@{userData?.name}</span>
                        <button 
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            Logout
                        </button>
                    </div>
                )}
            </div>

            {showPremiumBanner && (
                <div className="premium-banner">
                    <div className="premium-content">
                        <i className="fas fa-crown"></i>
                        <div className="premium-text">
                            <h3>Upgrade to Premium</h3>
                            <p>Get access to advanced features, priority support, and exclusive legal resources</p>
                            <button className="premium-button" onClick={() => navigate('/premium')}>
                                Upgrade Now
                            </button>
                        </div>
                        <button className="close-banner" onClick={() => setShowPremiumBanner(false)}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            )}

            <div className="blog-controls">
                <div className="search-filter">
                    <input
                        type="text"
                        placeholder="Search cases..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
                        <option value="all">All Cases</option>
                        <option value="my-posts">My Cases</option>
                        <option value="premium">Premium Cases</option>
                    </select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                        <option value="recent">Most Recent</option>
                        <option value="popular">Most Popular</option>
                        <option value="earnings">Highest Earnings</option>
                    </select>
                </div>

                <button 
                    className="create-post-button"
                    onClick={() => setShowCreatePost(true)}
                >
                    <i className="fas fa-plus"></i>
                    Create New Case
                </button>
            </div>

            <div className="blog-stats">
                <div className="stat-item">
                    <i className="fas fa-file-alt"></i>
                    <span>{posts.length} Total Cases</span>
                </div>
                <div className="stat-item">
                    <i className="fas fa-coins"></i>
                    <span>0 HIVE Earned</span>
                </div>
                <div className="stat-item">
                    <i className="fas fa-eye"></i>
                    <span>0 Total Views</span>
                </div>
                <div className="stat-item">
                    <i className="fas fa-star"></i>
                    <span>0 Expert Points</span>
                </div>
            </div>

            {showCreatePost && (
                <div className="create-post-modal">
                    <div className="modal-content">
                        <h2>Create New Legal Case</h2>
                        <form onSubmit={createPost}>
                            <div className="form-group">
                                <label>Case Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={newPost.title}
                                    onChange={handleInputChange}
                                    placeholder="Enter case title"
                                />
                            </div>
                            <div className="form-group">
                                <label>Case Details</label>
                                <textarea
                                    name="content"
                                    value={newPost.content}
                                    onChange={handleInputChange}
                                    placeholder="Enter case details..."
                                    rows="10"
                                />
                            </div>
                            <div className="form-group">
                                <label>Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    name="tags"
                                    value={newPost.tags}
                                    onChange={handleInputChange}
                                    placeholder="e.g., contract-law, property-dispute"
                                />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select 
                                    name="category" 
                                    value={newPost.category} 
                                    onChange={handleInputChange}
                                >
                                    <option value="legal">Legal</option>
                                    <option value="contract">Contract Law</option>
                                    <option value="property">Property Law</option>
                                    <option value="criminal">Criminal Law</option>
                                    <option value="civil">Civil Law</option>
                                    <option value="premium">Premium Case</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button 
                                    type="button"
                                    className="cancel-button"
                                    onClick={() => setShowCreatePost(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="submit-button"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="loading"></span>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-paper-plane"></i>
                                            Create Case
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="posts-grid">
                {Array.isArray(posts) && posts.map((post) => (
                    <div key={`${post.author}-${post.permlink}`} className="post-card">
                        <div className="post-header">
                            <div className="post-author">
                                <i className="fas fa-user-circle"></i>
                                <span>@{post.author}</span>
                            </div>
                            <div className="post-category">
                                <span className={`category-badge ${post.category || 'legal'}`}>
                                    {post.category || 'Legal'}
                                </span>
                            </div>
                        </div>
                        <h3>{post.title}</h3>
                        <p className="post-preview">
                            {post.body ? post.body.substring(0, 150) + '...' : 'No content available'}
                        </p>
                        <div className="post-meta">
                            <div className="meta-item">
                                <i className="fas fa-eye"></i>
                                <span>{post.stats?.views || 0} views</span>
                            </div>
                            <div className="meta-item">
                                <i className="fas fa-coins"></i>
                                <span>{post.stats?.earnings || '0.000 HIVE'}</span>
                            </div>
                            <div className="meta-item">
                                <i className="fas fa-clock"></i>
                                <span>{new Date(post.created).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="post-actions">
                            <button 
                                className="action-button read-more"
                                onClick={() => openCaseDetails(post)}
                            >
                                <i className="fas fa-book-reader"></i>
                                Read More
                            </button>
                            <button 
                                className="action-button donate"
                                onClick={() => setShowDonateModal(post)}
                            >
                                <i className="fas fa-hand-holding-usd"></i>
                                Donate
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {loading && (
                <div className="loading-more">
                    <span className="loading"></span>
                    Loading more posts...
                </div>
            )}

            {/* Case Details Modal */}
            {showCaseDetails && selectedCase && (
                <div className="case-details-modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{selectedCase.title || 'Untitled Case'}</h2>
                            <button 
                                className="close-button"
                                onClick={() => {
                                    setShowCaseDetails(false);
                                    setShowVoteSlider(false);
                                    setSelectedPostForVote(null);
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="case-meta">
                            <div className="meta-item">
                                <i className="fas fa-user"></i>
                                <span>@{selectedCase.author}</span>
                            </div>
                            <div className="meta-item">
                                <i className="fas fa-calendar"></i>
                                <span>
                                    {selectedCase.created ? 
                                        new Date(selectedCase.created).toLocaleDateString() : 
                                        'Date unknown'}
                                </span>
                            </div>
                            <div className="meta-item">
                                <i className="fas fa-tag"></i>
                                <span className={`category-badge ${selectedCase.category || 'legal'}`}>
                                    {selectedCase.category || 'Legal'}
                                </span>
                            </div>
                        </div>
                        <div className="case-content">
                            {selectedCase.body || 'No content available'}
                        </div>
                        <div className="case-stats">
                            <div className="stat-item">
                                <i className="fas fa-eye"></i>
                                <span>{selectedCase.stats?.views || 0} views</span>
                            </div>
                            <div className="stat-item">
                                <i className="fas fa-thumbs-up"></i>
                                <span>{selectedCase.stats?.votes || 0} votes</span>
                            </div>
                            <div className="stat-item">
                                <i className="fas fa-coins"></i>
                                <span>{selectedCase.stats?.earnings || 0} HIVE</span>
                            </div>
                        </div>
                        <div className="case-actions">
                            {!showVoteSlider ? (
                                <button 
                                    className="action-button vote"
                                    onClick={() => {
                                        setShowVoteSlider(true);
                                        setSelectedPostForVote(selectedCase);
                                    }}
                                >
                                    <i className="fas fa-thumbs-up"></i>
                                    Vote for this Case
                                </button>
                            ) : (
                                <div className="vote-slider-container">
                                    <div className="vote-weight-display">
                                        <span>Vote Weight: {voteWeight/100}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="100"
                                        max="10000"
                                        step="100"
                                        value={voteWeight}
                                        onChange={(e) => setVoteWeight(parseInt(e.target.value))}
                                        className="vote-slider"
                                    />
                                    <div className="vote-actions">
                                        <button 
                                            className="cancel-button"
                                            onClick={() => {
                                                setShowVoteSlider(false);
                                                setSelectedPostForVote(null);
                                                setVoteWeight(10000);
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            className="submit-button"
                                            onClick={() => handleVote(selectedCase)}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="loading"></span>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-thumbs-up"></i>
                                                    Submit Vote
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Donate Modal */}
            {showDonateModal && (
                <div className="donate-modal">
                    <div className="modal-content">
                        <h2>Donate to Case</h2>
                        <div className="form-group">
                            <label>Amount (HIVE)</label>
                            <input
                                type="number"
                                value={donateAmount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || parseFloat(value) >= 0) {
                                        setDonateAmount(value);
                                    }
                                }}
                                placeholder="Enter amount"
                                min="0.001"
                                step="0.001"
                            />
                        </div>
                        <div className="modal-actions">
                            <button 
                                className="cancel-button"
                                onClick={() => setShowDonateModal(null)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="submit-button"
                                onClick={() => handleDonate(showDonateModal)}
                                disabled={loading || !donateAmount || parseFloat(donateAmount) <= 0}
                            >
                                {loading ? (
                                    <>
                                        <span className="loading"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-hand-holding-usd"></i>
                                        Donate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBalanceMessage && (
                <div className="balance-message">
                    <div className="balance-content">
                        <i className="fas fa-exclamation-circle"></i>
                        <p>{balanceMessage}</p>
                        <button onClick={() => setShowBalanceMessage(false)}>Close</button>
                    </div>
                </div>
            )}

            <div className="user-balance">
                <i className="fas fa-wallet"></i>
                <span>Your Balance: {userBalance}</span>
            </div>

            {message && (
                <div className={`message ${typeof message === 'string' && message.toLowerCase().includes("successful") ? "success" : "error"}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default Blog; 