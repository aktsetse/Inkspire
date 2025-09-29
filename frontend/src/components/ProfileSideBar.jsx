import { useAuth } from "../App";
import { useNavigate, useLocation } from "react-router-dom";
import "./ProfileSideBar.css";

function ProfileSideBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleProfileClick = () => {
    if (!user) {
      alert("Please sign in to view your profile");
      return;
    }
    navigate("/profile");
  };

  return (
    <div className="profile-sidebar">
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
      </nav>
    </div>
  );
}

export default ProfileSideBar;
