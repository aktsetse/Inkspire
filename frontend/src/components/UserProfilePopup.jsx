import { useState, useEffect, useRef } from "react";
import FollowButton from "./FollowButton";
import "./UserProfilePopup.css";

function UserProfilePopup({ userId, supabaseId, onClose }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });
  const popupRef = useRef(null);

  useEffect(() => {
    fetchUserData();
    fetchFollowCounts();

    // Close popup when clicking outside
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      const response = await fetch(`/api/user-follows/counts/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFollowCounts(data);
      }
    } catch (error) {
      console.error("Error fetching follow counts:", error);
    }
  };

  const handleFollowStatusChange = () => {
    // Refresh follow counts when follow status changes
    fetchFollowCounts();
  };

  if (loading) {
    return (
      <div className="user-profile-popup" ref={popupRef}>
        <div className="loading-spinner-container">
          <div className="loading-spinner-large"></div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="user-profile-popup" ref={popupRef}>
        <p>User not found</p>
      </div>
    );
  }

  return (
    <div className="user-profile-popup" ref={popupRef}>
      <div className="user-info">
        <div className="user-name">
          {userData.first_name || userData.email.split("@")[0]}
          {userData.last_name ? ` ${userData.last_name}` : ""}
        </div>
        <div className="user-email">{userData.email}</div>
        {userData.bio && <div className="user-bio">{userData.bio}</div>}
      </div>

      <div className="follow-stats">
        <div className="follow-count">
          <span>{followCounts.followers}</span> Followers
        </div>
        <div className="follow-count">
          <span>{followCounts.following}</span> Following
        </div>
      </div>

      <FollowButton
        targetUserId={userId}
        targetUserSupabaseId={supabaseId}
        onFollowStatusChange={handleFollowStatusChange}
      />
    </div>
  );
}

export default UserProfilePopup;
