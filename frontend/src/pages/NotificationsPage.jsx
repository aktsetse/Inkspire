import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/FavoritesSidebar";
import "./NotificationsPage.css";

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/notifications/user/${user.id}`);

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark notification as read
    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "PUT",
      });

      // Update local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );

      // Navigate to the appropriate page based on notification type
      if (notification.comment_id) {
        // For comment notifications, navigate to the book page with comment highlighted
        navigate(
          `/book/${notification.bookId}?comment=${notification.comment_id}`
        );
      } else if (notification.isRecommendation) {
        // For recommendation notifications, navigate to the book details page
        navigate(`/book/${notification.bookId}`);
      } else {
        // For regular notifications, navigate to the discussion page
        navigate(`/discussion/${notification.bookId}`);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation(); // Prevent triggering the parent onClick event

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove the notification from the state
        setNotifications((prevNotifications) =>
          prevNotifications.filter((n) => n.id !== notificationId)
        );
      } else {
        console.error("Failed to delete notification");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || notifications.length === 0) return;

    try {
      await fetch(`/api/notifications/user/${user.id}/read-all`, {
        method: "PUT",
      });

      // Update local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) => ({ ...n, isRead: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  return (
    <div className="page-with-sidebar">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="notifications-page">
        <div className="notifications-header">
          <h1>Notifications</h1>
          {notifications.length > 0 && (
            <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading">Loading notifications...</div>
        ) : (
          <div className="notifications-container">
            {notifications.length > 0 ? (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${
                      notification.isRead ? "read" : "unread"
                    } ${notification.isRecommendation ? "recommendation" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-content">
                      {(notification.isRecommendation ||
                        (notification.content &&
                          notification.content.includes("NEW RELEASE"))) && (
                        <div className="recommendation-badge">
                          {notification.content &&
                          notification.content.includes("NEW RELEASE")
                            ? "🆕 New Release"
                            : "📚 Recommendation"}
                        </div>
                      )}
                      <p>{notification.content}</p>
                      <div className="notification-book">
                        <span className="book-icon">
                          {notification.isRecommendation ? "🌟" : "📖"}
                        </span>
                        <span className="book-title">
                          {notification.bookTitle}
                        </span>
                      </div>
                      {notification.isRecommendation &&
                        notification.bookData && (
                          <div className="recommendation-preview">
                            {notification.bookData.volumeInfo?.imageLinks
                              ?.thumbnail && (
                              <img
                                src={
                                  notification.bookData.volumeInfo.imageLinks
                                    .thumbnail
                                }
                                alt={
                                  notification.bookData.volumeInfo?.title ||
                                  "Book cover"
                                }
                                className="recommendation-thumbnail"
                              />
                            )}
                            <div className="recommendation-details">
                              <p className="recommendation-author">
                                {notification.bookData.volumeInfo
                                  ?.authors?.[0] || "Unknown author"}
                              </p>

                              <p className="recommendation-category">
                                {notification.bookData.volumeInfo
                                  ?.categories?.[0] || ""}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatDate(notification.createdAt)}
                      </span>
                      <div className="notification-actions">
                        {!notification.isRead && (
                          <span className="unread-indicator"></span>
                        )}
                        <button
                          className="delete-notification-btn"
                          onClick={(e) =>
                            handleDeleteNotification(e, notification.id)
                          }
                          aria-label="Delete notification"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-notifications">
                <p>You don't have any notifications yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
