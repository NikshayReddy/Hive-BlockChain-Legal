import React, { useState, useEffect } from 'react';
import { Client } from '@hiveio/dhive';
import './Network.css';

const client = new Client(['https://api.hive.blog', 'https://api.hivekings.com']);

function Network() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [following, setFollowing] = useState([]);
    const username = localStorage.getItem('hive_username');

    useEffect(() => {
        if (username) {
            fetchFollowing();
        }
    }, [username]);

    const fetchFollowing = async () => {
        try {
            const followingList = await client.call('follow_api', 'get_following', [username, '', 'blog', 1000]);
            setFollowing(followingList.map(f => f.following));
        } catch (err) {
            console.error('Following error:', err);
            setError('Error fetching following list: ' + err.message);
        }
    };

    const searchUsers = async () => {
        if (!searchTerm) return;
        
        try {
            setLoading(true);
            // Search for accounts by name pattern
            const accounts = await client.database.call('lookup_accounts', [searchTerm, 20]);
            const accountDetails = await client.database.getAccounts(accounts);
            
            // Filter for users who have posted with law-related tags
            const legalUsers = accountDetails.filter(user => {
                const metadata = user.posting_json_metadata ? JSON.parse(user.posting_json_metadata) : {};
                return metadata.tags && (metadata.tags.includes('law') || metadata.tags.includes('legal'));
            });
            
            setUsers(legalUsers);
        } catch (err) {
            setError('Error searching users: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const followUser = async (userToFollow) => {
        if (!username) {
            setError('Please login first');
            return;
        }

        try {
            const operation = ['follow', {
                follower: username,
                following: userToFollow,
                what: ['blog']  // 'blog' means to follow the user
            }];

            window.hive_keychain.requestBroadcast(
                username,
                [['custom_json', {
                    required_auths: [],
                    required_posting_auths: [username],
                    id: 'follow',
                    json: JSON.stringify(operation)
                }]],
                'posting',
                response => {
                    if (response.success) {
                        setFollowing([...following, userToFollow]);
                    } else {
                        setError('Failed to follow user: ' + response.message);
                    }
                }
            );
        } catch (err) {
            setError('Error following user: ' + err.message);
        }
    };

    const unfollowUser = async (userToUnfollow) => {
        if (!username) {
            setError('Please login first');
            return;
        }

        try {
            const operation = ['follow', {
                follower: username,
                following: userToUnfollow,
                what: []  // Empty array means to unfollow
            }];

            window.hive_keychain.requestBroadcast(
                username,
                [['custom_json', {
                    required_auths: [],
                    required_posting_auths: [username],
                    id: 'follow',
                    json: JSON.stringify(operation)
                }]],
                'posting',
                response => {
                    if (response.success) {
                        setFollowing(following.filter(f => f !== userToUnfollow));
                    } else {
                        setError('Failed to unfollow user: ' + response.message);
                    }
                }
            );
        } catch (err) {
            setError('Error unfollowing user: ' + err.message);
        }
    };

    return (
        <div className="network-container">
            <h2>Connect with Legal Professionals</h2>
            
            {/* Search Bar */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search for users..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button onClick={searchUsers} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}

            {/* Users List */}
            <div className="users-list">
                {users.map(user => (
                    <div key={user.name} className="user-card">
                        <div className="user-info">
                            <h3>@{user.name}</h3>
                            <p>{user.posting_json_metadata ? 
                                JSON.parse(user.posting_json_metadata).profile?.about : 
                                'No bio available'}
                            </p>
                        </div>
                        <div className="user-stats">
                            <span>Followers: {user.follower_count}</span>
                            <span>Posts: {user.post_count}</span>
                        </div>
                        {following.includes(user.name) ? (
                            <button 
                                className="unfollow-button"
                                onClick={() => unfollowUser(user.name)}
                            >
                                Unfollow
                            </button>
                        ) : (
                            <button 
                                className="follow-button"
                                onClick={() => followUser(user.name)}
                            >
                                Follow
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Network; 