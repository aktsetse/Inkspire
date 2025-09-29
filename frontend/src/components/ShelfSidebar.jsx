import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { useNavigate, useLocation } from "react-router-dom";
import "./ShelfSidebar.css";

function Sidebar() {
  const [shelfBooksCount, setShelfBooksCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      loadShelfBooksCount();
      fetchNotificationsCount();

      // Set up polling to check for new notifications every 30 seconds
      const interval = setInterval(fetchNotificationsCount, 30000);
      return () => clearInterval(interval);
    } else {
      setShelfBooksCount(0);
      setNotificationsCount(0);
    }
  }, [user]);

  const loadShelfBooksCount = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/shelf/${user.id}`
      );

      if (response.ok) {
        const shelfData = await response.json();
        setShelfBooksCount(shelfData.length);
      } else {
        setShelfBooksCount(0);
      }
    } catch (error) {
      setShelfBooksCount(0);
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

  const handleShelfClick = () => {
    if (!user) {
      alert("Please sign in to view shelf");
      return;
    }
    navigate("/shelf");
  };

  const handleNotificationsClick = () => {
    if (!user) {
      alert("Please sign in to view notifications");
      return;
    }
    navigate("/notifications");
  };

  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={`sidebar-tab ${
            location.pathname === "/shelf" ? "active" : ""
          }`}
          onClick={handleShelfClick}
        >
          <span className="tab-icon">📚</span>
          <span className="tab-text">My Shelf</span>
          {shelfBooksCount > 0 && (
            <span className="tab-count">{shelfBooksCount}</span>
          )}
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
