import { useState, useEffect } from "react";
import { useAuth } from "../App";
import BookCard from "../BookCard";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/FavoritesSidebar";
import "./FavoritesPage.css";

function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [shelfItems, setShelfItems] = useState(new Set());
  const [joinedChannels, setJoinedChannels] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadFavorites();
      loadShelfItems();
      loadJoinedChannels();
    } else {
      setFavorites([]);
      setShelfItems(new Set());
      setJoinedChannels(new Set());
      setLoading(false);
    }
  }, [user]);

  const loadShelfItems = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/shelf/${user.id}`);

      if (response.ok) {
        const shelfData = await response.json();
        const shelfIds = new Set(shelfData.map((item) => item.book_id));
        setShelfItems(shelfIds);
      } else {
        setShelfItems(new Set());
      }
    } catch (error) {
      setShelfItems(new Set());
    }
  };

  const loadFavorites = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First get the user's database ID
      const userResponse = await fetch(`/api/users/supabase/${user.id}`);

      if (!userResponse.ok) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const userData = await userResponse.json();
      const userId = userData.id; // Get the numeric database ID

      // Now fetch favorites with the correct ID
      const response = await fetch(`/api/favorites/${userId}`);

      if (response.ok) {
        const favoritesData = await response.json();
        setFavorites(favoritesData);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromFavorites = async (book) => {
    if (!user) return;

    try {
      const response = await fetch("/api/favorites", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supabase_id: user.id,
          book_id: book.id,
        }),
      });

      if (response.ok) {
        setFavorites((prev) => prev.filter((fav) => fav.book_id !== book.id));
      } else {
        alert("Failed to remove from favorites. Please try again.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  const loadJoinedChannels = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/user-channels/user/${user.id}`
      );

      if (response.ok) {
        const channelsData = await response.json();
        const channelIds = new Set(channelsData.map((channel) => channel.id));
        setJoinedChannels(channelIds);
      } else {
        setJoinedChannels(new Set());
      }
    } catch (error) {
      setJoinedChannels(new Set());
    }
  };

  const handleJoinDiscussion = async (book) => {
    if (!user) return;

    try {
      const isJoined = joinedChannels.has(book.id);

      if (isJoined) {
        // Leave the channel
        const response = await fetch(
          "http://localhost:3000/api/user-channels/leave",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              bookId: book.id,
            }),
          }
        );

        if (response.ok) {
          setJoinedChannels((prev) => {
            const newJoinedChannels = new Set(prev);
            newJoinedChannels.delete(book.id);
            return newJoinedChannels;
          });
        } else {
          alert("Failed to leave discussion. Please try again.");
        }
      } else {
        // Join the channel
        const response = await fetch(
          "http://localhost:3000/api/user-channels/join",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              bookId: book.id,
              bookTitle: book.volumeInfo.title,
              bookData: book,
            }),
          }
        );

        if (response.ok) {
          setJoinedChannels((prev) => {
            const newJoinedChannels = new Set(prev);
            newJoinedChannels.add(book.id);
            return newJoinedChannels;
          });

          // Navigate to the discussion page
          navigate(`/discussion/${book.id}`);
        } else {
          alert("Failed to join discussion. Please try again.");
        }
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  const handleToggleToShelf = async (book) => {
    if (!user) return;

    try {
      // Check if book is already on shelf by making a request
      const checkResponse = await fetch(`/api/shelf/${user.id}`);

      let isOnShelf = false;
      if (checkResponse.ok) {
        const shelfData = await checkResponse.json();
        isOnShelf = shelfData.some((item) => item.book_id === book.id);
      }

      if (isOnShelf) {
        // Remove from shelf
        const response = await fetch("/api/shelf", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supabase_id: user.id,
            book_id: book.id,
          }),
        });

        if (response.ok) {
          // Update local shelf state
          setShelfItems((prev) => {
            const newShelfItems = new Set(prev);
            newShelfItems.delete(book.id);
            return newShelfItems;
          });
        } else {
          alert ("Failed to remove from shelf. Please try again.");
        }
      } else {
        // Add to shelf
        const response = await fetch("/api/shelf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supabase_id: user.id,
            book_id: book.id,
            book_title: book.volumeInfo.title,
            book_data: book,
          }),
        });

        if (response.ok) {
          // Update local shelf state
          setShelfItems((prev) => {
            const newShelfItems = new Set(prev);
            newShelfItems.add(book.id);
            return newShelfItems;
          });
        } else {
          alert("Failed to add to shelf. Please try again.");
        }
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  if (!user) {
    return (
      <div className="favorites-page">
        <div className="sidebar-container">
          <Sidebar />
        </div>
        <div className="favorites-content">
          <div className="favorites-header">
            <h1>My Favorites</h1>
          </div>
          <div className="no-user-message">
            <p>Please sign in to view your favorites</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="sidebar-container">
          <Sidebar />
        </div>
        <div className="favorites-content">
          <div className="favorites-header">
            <h1>My Favorites</h1>
          </div>
          <div className="loading-message">
            <p>Loading your favorites...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="favorites-content">
        <button
          className="favorites-previous"
          onClick={() => navigate("/dashboard")}
        >
          ❮ Previous
        </button>

        <div className="favorites-header">
          <h1>My Favorites ({favorites.length})</h1>
          <p>Books you've added to your favorites collection</p>
        </div>

        {favorites.length === 0 ? (
          <div className="no-favorites-message">
            <h2>No favorites yet!</h2>
            <p>
              Start exploring books and add them to your favorites by clicking
              the heart icon.
            </p>
            <a href="/dashboard" className="browse-books-btn">
              Browse Books
            </a>
          </div>
        ) : (
          <div className="favorites-grid">
            {favorites.map((favorite) => {
              // Convert the stored favorite back to the book format expected by BookCard
              const book = {
                id: favorite.book_id,
                volumeInfo: {
                  title: favorite.book_title,
                  authors: favorite.book_data?.volumeInfo?.authors || [
                    "Unknown Author",
                  ],
                  imageLinks: favorite.book_data?.volumeInfo?.imageLinks || {},
                  description:
                    favorite.book_data?.volumeInfo?.description || "",
                  publishedDate:
                    favorite.book_data?.volumeInfo?.publishedDate || "",
                  publisher: favorite.book_data?.volumeInfo?.publisher || "",
                  pageCount: favorite.book_data?.volumeInfo?.pageCount || 0,
                  categories: favorite.book_data?.volumeInfo?.categories || [],
                  averageRating:
                    favorite.book_data?.volumeInfo?.averageRating || 0,
                  ratingsCount:
                    favorite.book_data?.volumeInfo?.ratingsCount || 0,
                },
              };

              return (
                <BookCard
                  key={favorite.book_id}
                  book={book}
                  isFavorite={true}
                  toShelf={shelfItems.has(book.id)}
                  onToggleFavorite={() => handleRemoveFromFavorites(book)}
                  onToggleToShelf={() => handleToggleToShelf(book)}
                  onJoinDiscussion={handleJoinDiscussion}
                  isJoined={joinedChannels.has(book.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default FavoritesPage;
