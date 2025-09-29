import { useState, useEffect } from "react";
import { useAuth } from "../App";
import "./FollowButton.css";

function FollowButton({
  targetUserId,
  targetUserSupabaseId,
  onFollowStatusChange,
}) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCurrentUserId();
    }
  }, [user]);

  useEffect(() => {
    if (currentUserId && targetUserId) {
      checkFollowStatus();
    }
  }, [currentUserId, targetUserId]);

  const fetchCurrentUserId = async () => {
    try {
      const response = await fetch(`/api/users/supabase/${user.id}`);
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserId(userData.id);
      }
    } catch (error) {
      console.error("Error fetching current user ID:", error);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(
        `/api/user-follows/is-following/${currentUserId}/${targetUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !currentUserId || !targetUserId) return;

    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch(`/api/user-follows/unfollow`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            followerId: currentUserId,
            followingId: targetUserId,
          }),
        });

        if (response.ok) {
          setIsFollowing(false);
          if (onFollowStatusChange) {
            onFollowStatusChange(false);
          }
        }
      } else {
        // Follow
        const response = await fetch(`/api/user-follows/follow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            followerId: currentUserId,
            followingId: targetUserId,
          }),
        });

        if (response.ok) {
          setIsFollowing(true);
          if (onFollowStatusChange) {
            onFollowStatusChange(true);
          }
        }
      }
    } catch (error) {
      console.error("Error toggling follow status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show the button if the user is not logged in or is trying to follow themselves
  if (!user || user.id === targetUserSupabaseId) {
    return null;
  }

  return (
    <button
      className={`follow-button ${isFollowing ? "following" : ""}`}
      onClick={handleFollowToggle}
      disabled={loading}
    >
      {loading ? (
        <span className="loading-spinner"></span>
      ) : isFollowing ? (
        <>
          <span className="follow-icon">✓</span>
          Following
        </>
      ) : (
        <>
          <span className="follow-icon">+</span>
          Follow
        </>
      )}
    </button>
  );
}

export default FollowButton;
