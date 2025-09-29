import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllCelebrities } from "../services/celebrityService";
import "./CelebrityList.css";

function CelebrityList() {
  const [celebrities, setCelebrities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCelebrities = async () => {
      try {
        // For testing purposes, using followerThreshold=1 and commentThreshold=1
        // Setting requireComments=false to include all users with sufficient followers
        const celebs = await getAllCelebrities(1, 1, false);
        setCelebrities(celebs);
        setLoading(false);
      } catch (err) {
        setError("Failed to load celebrities");
        setLoading(false);
      }
    };

    fetchCelebrities();
  }, []);

  const handleNavigateToProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  if (loading) {
    return (
      <div className="celebrity-list">
        <h3>Celebrity Users</h3>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="celebrity-list">
        <h3>Celebrity Users</h3>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="celebrity-list">
      <h3>Celebrity Users</h3>
      {celebrities.length === 0 ? (
        <p>No celebrity users found</p>
      ) : (
        <ul>
          {celebrities.map((celebrity) => (
            <li
              key={celebrity.id}
              className="celebrity-item"
              onClick={() => handleNavigateToProfile(celebrity.id)}
              title="Click to view profile"
            >
              <div className="celebrity-info">
                <div className="celebrity-name">
                  {celebrity.first_name || celebrity.email.split("@")[0]}
                </div>
                <div className="celebrity-followers">
                  {celebrity.num_followers} follower
                  {celebrity.num_followers !== 1 ? "s" : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CelebrityList;
