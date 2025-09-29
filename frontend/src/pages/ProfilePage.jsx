import { useState, useEffect } from "react";
import { useAuth } from "../App";
import Sidebar from "../components/FavoritesSidebar";
import FollowButton from "../components/FollowButton";
import "./ProfilePage.css";

function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [joinedChannels, setJoinedChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bioEditing, setBioEditing] = useState(false);
  const [bioText, setBioText] = useState("");
  const [bioSaving, setBioSaving] = useState(false);
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
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchJoinedChannels();
    }
  }, [user]);

  useEffect(() => {
    if (userData) {
      fetchFollowCounts();
    }
  }, [userData]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/users/supabase/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setBioText(data.bio || "");
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
    if (!user) return;

    try {
      const response = await fetch(`/api/user-channels/user/${user.id}`);
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
    if (!user || !userData) return;

    try {
      const response = await fetch(`/api/user-follows/counts/${userData.id}`);
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
    if (!user || !userData) return;

    setLoadingFollowers(true);
    try {
      const response = await fetch(
        `/api/user-follows/followers/${userData.id}`
      );
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
    if (!user || !userData) return;

    setLoadingFollowing(true);
    try {
      const response = await fetch(
        `/api/user-follows/following/${userData.id}`
      );
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

  const handleBioEdit = () => {
    setBioEditing(true);
  };

  const handleBioSave = async () => {
    if (!user) return;

    setBioSaving(true);
    try {
      const response = await fetch(`/api/users/${userData.supabase_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: bioText }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUserData(updatedUser);
        setBioEditing(false);
      } else {
        console.error("Failed to update bio");
      }
    } catch (error) {
      console.error("Error updating bio:", error);
    } finally {
      setBioSaving(false);
    }
  };

  const handleBioCancel = () => {
    setBioText(userData?.bio || "");
    setBioEditing(false);
  };

  const handleJoinDiscussion = (channelId) => {
    window.location.href = `/discussion/${channelId}`;
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
    // Refresh follow counts and lists when follow status changes
    fetchFollowCounts();
    if (showFollowers) {
      fetchFollowers();
    }
    if (showFollowing) {
      fetchFollowing();
    }
  };

  // No longer needed as we're using FollowButton component

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

  return (
    <div className="profile-page">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="profile-content">
        <div className="profile-header">
          <div className="profile-header-content">
            <h1>My Profile</h1>
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
                            onClick={() =>
                              (window.location.href = `/user/${follower.id}`)
                            }
                          >
                            <span className="follow-user-name">
                              {follower.first_name ||
                                follower.email.split("@")[0]}
                            </span>
                            <span className="follow-user-email">
                              {follower.email}
                            </span>
                          </div>
                          {follower.id !== userData.id && (
                            <FollowButton
                              targetUserId={follower.id}
                              targetUserSupabaseId={follower.supabase_id}
                              onFollowStatusChange={handleFollowStatusChange}
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
                            onClick={() =>
                              (window.location.href = `/user/${followedUser.id}`)
                            }
                          >
                            <span className="follow-user-name">
                              {followedUser.first_name ||
                                followedUser.email.split("@")[0]}
                            </span>
                            <span className="follow-user-email">
                              {followedUser.email}
                            </span>
                          </div>
                          <FollowButton
                            targetUserId={followedUser.id}
                            targetUserSupabaseId={followedUser.supabase_id}
                            onFollowStatusChange={handleFollowStatusChange}
                          />
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
          {userData ? (
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
          ) : (
            <p>No user information available</p>
          )}
        </div>

        <div className="profile-section">
          <div className="bio-header">
            <h2>Bio</h2>
            {!bioEditing && (
              <button onClick={handleBioEdit} className="edit-bio-btn">
                {userData?.bio ? "Edit" : "Add Bio"}
              </button>
            )}
          </div>

          {bioEditing ? (
            <div className="bio-edit">
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className="bio-textarea"
              />
              <div className="bio-actions">
                <button
                  onClick={handleBioSave}
                  className="save-bio-btn"
                  disabled={bioSaving}
                >
                  {bioSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleBioCancel}
                  className="cancel-bio-btn"
                  disabled={bioSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="bio-display">
              {userData?.bio ? (
                <p>{userData.bio}</p>
              ) : (
                <p className="no-bio">No bio added yet.</p>
              )}
            </div>
          )}
        </div>

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
            <p>You haven't joined any book discussions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
