import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { useNavigate, useLocation } from "react-router-dom";
import "./FavoritesSidebar.css";

function Sidebar() {
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [shelfCount, setShelfCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      loadFavoritesCount();
      loadShelfCount();
      loadRecommendationsCount();
      fetchNotificationsCount();

      // Set up polling to check for new notifications every 30 seconds
      const interval = setInterval(fetchNotificationsCount, 30000);
      return () => clearInterval(interval);
    } else {
      setFavoritesCount(0);
      setShelfCount(0);
      setNotificationsCount(0);
    }
  }, [user]);

  const loadFavoritesCount = async () => {
    if (!user) return;

    try {
      // First get the user's database ID
      const userResponse = await fetch(`/api/users/supabase/${user.id}`);

      if (!userResponse.ok) {
        setFavoritesCount(0);
        return;
      }

      const userData = await userResponse.json();
      const userId = userData.id; // Get the numeric database ID

      // Now fetch favorites with the correct ID
      const response = await fetch(`/api/favorites/${userId}`);

      if (response.ok) {
        const favoritesData = await response.json();
        setFavoritesCount(favoritesData.length);
      } else {
        setFavoritesCount(0);
      }
    } catch (error) {
      setFavoritesCount(0);
    }
  };

  const loadShelfCount = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/shelf/${user.id}`);

      if (response.ok) {
        const shelfData = await response.json();
        setShelfCount(shelfData.length);
      } else {
        setShelfCount(0);
      }
    } catch (error) {
      setShelfCount(0);
    }
  };

  const loadRecommendationsCount = async () => {
    // This function is kept for compatibility but doesn't update any state
    if (!user) return;

    try {
      const response = await fetch(`/api/recommendations/${user.id}`);
      if (!response.ok) {
        console.error("Error loading recommendations");
      }
    } catch (error) {
      console.error("Error loading recommendations count:", error);
    }
  };

  const fetchNotificationsCount = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/notifications/user/${user.id}`
      );

      if (response.ok) {
        const notifications = await response.json();
        setNotificationsCount(notifications.length);
      } else {
        setNotificationsCount(0);
      }
    } catch (error) {
      setNotificationsCount(0);
    }
  };

  const handleFavoritesClick = () => {
    if (!user) {
      alert("Please sign in to view favorites");
      return;
    }
    navigate("/favorites");
  };

  const handleShelfClick = () => {
    if (!user) {
      alert("Please sign in to view shelf");
      return;
    }
    navigate("/shelf");
  };

  const handleRecommendationsClick = () => {
    if (!user) {
      alert("Please sign in to view recommendations");
      return;
    }
    navigate("/recommendations");
  };

  const handleNotificationsClick = () => {
    if (!user) {
      alert("Please sign in to view notifications");
      return;
    }
    navigate("/notifications");
  };

  const handleProfileClick = () => {
    if (!user) {
      return;
    }
    navigate("/profile");
  };

  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={`sidebar-tab ${
            location.pathname === "/profile" ? "active" : ""
          }`}
          onClick={handleProfileClick}
        >
          <span className="tab-icon">👤</span>
          <span className="tab-text">My Profile</span>
        </button>
        <button
          className={`sidebar-tab ${
            location.pathname === "/favorites" ? "active" : ""
          }`}
          onClick={handleFavoritesClick}
        >
          <span className="tab-icon">❤️</span>
          <span className="tab-text">My Favorites</span>
          {favoritesCount > 0 && (
            <span className="tab-count">{favoritesCount}</span>
          )}
        </button>

        <button
          className={`sidebar-tab ${
            location.pathname === "/shelf" ? "active" : ""
          }`}
          onClick={handleShelfClick}
        >
          <span className="tab-icon">📚</span>
          <span className="tab-text">My Shelf</span>
          {shelfCount > 0 && <span className="tab-count">{shelfCount}</span>}
        </button>

        <button
          className={`sidebar-tab ${
            location.pathname === "/recommendations" ? "active" : ""
          }`}
          onClick={handleRecommendationsClick}
        >
          <span className="tab-icon">🎯</span>
          <span className="tab-text">My Recommendations</span>
          {/* {recommendationsCount > 0 && (
            <span className="tab-count">{recommendationsCount}</span>
          )} */}
        </button>

        <button
          className={`sidebar-tab ${
            location.pathname === "/notifications" ? "active" : ""
          }`}
          onClick={handleNotificationsClick}
        >
          <span className="tab-icon">🔔</span>
          <span className="tab-text">Notifications</span>
          {notificationsCount > 0 && (
            <span className="tab-count">{notificationsCount}</span>
          )}
        </button>
      </nav>
    </div>
  );
}

export default Sidebar;
