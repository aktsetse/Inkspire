import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/FavoritesSidebar";
import FollowButton from "../components/FollowButton";
import "./ProfilePage.css";

function OtherUserProfilePage() {
  const [userData, setUserData] = useState(null);
  const [joinedChannels, setJoinedChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
  const { user } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();

    if (user) {
      fetchCurrentUserData();
    }
  }, [userId, user]);

  // Fetch joined channels when userData is available
  useEffect(() => {
    if (userData) {
      fetchJoinedChannels();
    }
  }, [userData]);

  useEffect(() => {
    if (userData) {
      fetchFollowCounts();
    }
  }, [userData]);

  const fetchCurrentUserData = async () => {
    try {
      const response = await fetch(`/api/users/supabase/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentUserData(data);
      }
    } catch (error) {
      console.error("Error fetching current user data:", error);
    }
  };

  // No longer needed as we're using navigate directly

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        console.error("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJoinedChannels = async () => {
    try {
      // First get the user's supabase_id since the API expects that
      if (!userData) return;

      const response = await fetch(
        `/api/user-channels/user/${userData.supabase_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setJoinedChannels(data);
      } else {
        console.error("Failed to fetch joined channels");
      }
    } catch (error) {
      console.error("Error fetching joined channels:", error);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      const response = await fetch(`/api/user-follows/counts/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowCounts(data);
      } else {
        console.error("Failed to fetch follow counts");
      }
    } catch (error) {
      console.error("Error fetching follow counts:", error);
    }
  };

  const fetchFollowers = async () => {
    setLoadingFollowers(true);
    try {
      const response = await fetch(`/api/user-follows/followers/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowers(data);
      } else {
        console.error("Failed to fetch followers");
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const fetchFollowing = async () => {
    setLoadingFollowing(true);
    try {
      const response = await fetch(`/api/user-follows/following/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowing(data);
      } else {
        console.error("Failed to fetch following");
      }
    } catch (error) {
      console.error("Error fetching following:", error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleJoinDiscussion = (channelId) => {
    navigate(`/discussion/${channelId}`);
  };

  const toggleFollowers = () => {
    if (!showFollowers && followers.length === 0) {
      fetchFollowers();
    }
    setShowFollowers(!showFollowers);
    setShowFollowing(false);
  };

  const toggleFollowing = () => {
    if (!showFollowing && following.length === 0) {
      fetchFollowing();
    }
    setShowFollowing(!showFollowing);
    setShowFollowers(false);
  };

  const handleFollowStatusChange = () => {
    // Refresh follow counts when follow status changes
    fetchFollowCounts();
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFollowers || showFollowing) {
        const dropdowns = document.querySelectorAll(".follow-dropdown");
        let clickedInside = false;

        dropdowns.forEach((dropdown) => {
          if (dropdown.contains(event.target)) {
            clickedInside = true;
          }
        });

        const buttons = document.querySelectorAll(".follow-count-btn");
        buttons.forEach((button) => {
          if (button.contains(event.target)) {
            clickedInside = true;
          }
        });

        if (!clickedInside) {
          setShowFollowers(false);
          setShowFollowing(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFollowers, showFollowing]);

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!userData) {
    return (
      <div className="profile-page">
        <div className="sidebar-container">
          <Sidebar />
        </div>
        <div className="profile-content">
          <div className="profile-header">
            <h1>User Not Found</h1>
          </div>
          <p>The user you're looking for doesn't exist or has been removed.</p>
          <button className="back-button" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-header-content">
            <h1>
              {userData.first_name || userData.email.split("@")[0]}'s Profile
            </h1>
            {currentUserData && userData.id !== currentUserData.id && (
              <FollowButton
                targetUserId={userData.id}
                targetUserSupabaseId={userData.supabase_id}
                onFollowStatusChange={handleFollowStatusChange}
              />
            )}
          </div>
        </div>

        <div className="connections-section">
          <div className="connections">
            <div className="followers">
              <button className="follow-count-btn" onClick={toggleFollowers}>
                {followCounts.followers} Followers
              </button>
              {showFollowers && (
                <div className="follow-dropdown">
                  <h3>Followers</h3>
                  {loadingFollowers ? (
                    <p className="loading-text">Loading followers...</p>
                  ) : followers.length > 0 ? (
                    <ul className="follow-list">
                      {followers.map((follower) => (
                        <li key={follower.id} className="follow-item">
                          <div
                            className="follow-user-info"
                            onClick={() => navigate(`/user/${follower.id}`)}
                          >
                            <span className="follow-user-name">
                              {follower.first_name ||
                                follower.email.split("@")[0]}
                            </span>
                            <span className="follow-user-email">
                              {follower.email}
                            </span>
                          </div>
                          {currentUserData &&
                            follower.id !== currentUserData.id && (
                              <FollowButton
                                targetUserId={follower.id}
                                targetUserSupabaseId={follower.supabase_id}
                              />
                            )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-follows">No followers yet</p>
                  )}
                </div>
              )}
            </div>

            <div className="following">
              <button className="follow-count-btn" onClick={toggleFollowing}>
                {followCounts.following} Following
              </button>
              {showFollowing && (
                <div className="follow-dropdown">
                  <h3>Following</h3>
                  {loadingFollowing ? (
                    <p className="loading-text">Loading following...</p>
                  ) : following.length > 0 ? (
                    <ul className="follow-list">
                      {following.map((followedUser) => (
                        <li key={followedUser.id} className="follow-item">
                          <div
                            className="follow-user-info"
                            onClick={() => navigate(`/user/${followedUser.id}`)}
                          >
                            <span className="follow-user-name">
                              {followedUser.first_name ||
                                followedUser.email.split("@")[0]}
                            </span>
                            <span className="follow-user-email">
                              {followedUser.email}
                            </span>
                          </div>
                          {currentUserData &&
                            followedUser.id !== currentUserData.id && (
                              <FollowButton
                                targetUserId={followedUser.id}
                                targetUserSupabaseId={followedUser.supabase_id}
                              />
                            )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-follows">Not following anyone yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h2>User Information</h2>
          <div className="user-info">
            <p>
              <strong>Name:</strong> {userData.first_name || ""}{" "}
              {userData.last_name || ""}
            </p>
            <p>
              <strong>Email:</strong> {userData.email}
            </p>
            <p>
              <strong>Member since:</strong>{" "}
              {new Date(userData.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {userData.bio && (
          <div className="profile-section">
            <h2>Bio</h2>
            <div className="bio-display">
              <p>{userData.bio}</p>
            </div>
          </div>
        )}

        <div className="profile-section">
          <h2>Book Discussions Joined</h2>
          {joinedChannels.length > 0 ? (
            <ul className="channels-list">
              {joinedChannels.map((channel) => (
                <li key={channel.id} className="channel-item">
                  <div className="channel-info">
                    <span className="channel-title">{channel.title}</span>
                    <span className="channel-author">by {channel.author}</span>
                    <span className="channel-joined">
                      Joined: {new Date(channel.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="join-discussion-btn"
                    onClick={() => handleJoinDiscussion(channel.id)}
                  >
                    Join Discussion
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>This user hasn't joined any book discussions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default OtherUserProfilePage;
