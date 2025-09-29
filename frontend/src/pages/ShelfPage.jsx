import { useState, useEffect } from "react";
import { useAuth } from "../App";
import BookCard from "../BookCard";
import Sidebar from "../components/FavoritesSidebar";
import "./ShelfPage.css";
import { useNavigate } from "react-router-dom";

function ShelfPage() {
  const [shelf, setShelf] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState(new Set());
  const [joinedChannels, setJoinedChannels] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadShelf();
      loadFavoriteItems();
      loadJoinedChannels();
    } else {
      setShelf([]);
      setFavoriteItems(new Set());
      setJoinedChannels(new Set());
      setLoading(false);
    }
  }, [user]);

  const loadFavoriteItems = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/favorites/${user.id}`);

      if (response.ok) {
        const favoritesData = await response.json();
        const favoriteIds = new Set(favoritesData.map((fav) => fav.book_id));
        setFavoriteItems(favoriteIds);
      } else {
        setFavoriteItems(new Set());
      }
    } catch (error) {
      setFavoriteItems(new Set());
    }
  };

  const loadShelf = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/shelf/${user.id}`);

      if (response.ok) {
        const shelfData = await response.json();
        setShelf(shelfData);
      } else {
        setShelf([]);
      }
    } catch (error) {
      setShelf([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromShelf = async (book) => {
    if (!user) return;

    try {
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
        // Remove from local state
        setShelf((prev) => prev.filter((item) => item.book_id !== book.id));
      } else {
      }
    } catch (error) {}
  };

  const loadJoinedChannels = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/user-channels/user/${user.id}`);

      if (response.ok) {
        const channelsData = await response.json();
        const channelIds = new Set(channelsData.map((channel) => channel.id));
        setJoinedChannels(channelIds);
      } else {
        setJoinedChannels(new Set());
      }
    } catch (error) {
      console.error("Error loading joined channels:", error);
      setJoinedChannels(new Set());
    }
  };

  const handleJoinDiscussion = async (book) => {
    if (!user) return;

    try {
      const isJoined = joinedChannels.has(book.id);

      if (isJoined) {
        // Leave the channel
        const response = await fetch("/api/user-channels/leave", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            bookId: book.id,
          }),
        });

        if (response.ok) {
          setJoinedChannels((prev) => {
            const newJoinedChannels = new Set(prev);
            newJoinedChannels.delete(book.id);
            return newJoinedChannels;
          });
        } else {
        }
      } else {
        // Join the channel
        const response = await fetch("/api/user-channels/join", {
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
        });

        if (response.ok) {
          setJoinedChannels((prev) => {
            const newJoinedChannels = new Set(prev);
            newJoinedChannels.add(book.id);
            return newJoinedChannels;
          });

          // Navigate to the discussion page
          navigate(`/discussion/${book.id}`);
        } else {
        }
      }
    } catch (error) {}
  };

  const handleToggleToFavorites = async (book) => {
    if (!user) return;

    try {
      // Check if book is already in favorites by making a request
      const checkResponse = await fetch(`/api/favorites/${user.id}`);

      let isFavorite = false;
      if (checkResponse.ok) {
        const favoritesData = await checkResponse.json();
        isFavorite = favoritesData.some((fav) => fav.book_id === book.id);
      }

      if (isFavorite) {
        // Remove from favorites
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
          // Update local favorites state
          setFavoriteItems((prev) => {
            const newFavoriteItems = new Set(prev);
            newFavoriteItems.delete(book.id);
            return newFavoriteItems;
          });
        } else {
        }
      } else {
        // Add to favorites
        const response = await fetch("/api/favorites", {
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
          // Update local favorites state
          setFavoriteItems((prev) => {
            const newFavoriteItems = new Set(prev);
            newFavoriteItems.add(book.id);
            return newFavoriteItems;
          });
        } else {
          alert("Failed to add to favorites. Please try again.");
        }
      }
    } catch (error) {}
  };

  if (!user) {
    return (
      <div className="shelf-page">
        <div className="sidebar-container">
          <Sidebar />
        </div>
        <div className="shelf-content">
          <div className="shelf-header">
            <h1>My Shelf</h1>
          </div>
          <div className="no-user-message">
            <p>Please sign in to view your shelf</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shelf-page">
        <div className="sidebar-container">
          <Sidebar />
        </div>
        <div className="shelf-content">
          <div className="shelf-header">
            <h1>My Shelf</h1>
          </div>
          <div className="loading-message">
            <p>Loading your Shelf...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shelf-page">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="shelf-content">
        <button
          className="shelf-previous"
          onClick={() => navigate("/dashboard")}
        >
          ❮ Previous
        </button>
        <div className="shelf-header">
          <h1>My Shelf ({shelf.length})</h1>
          <p>Books you've added to your shelf collection</p>
        </div>

        {shelf.length === 0 ? (
          <div className="no-books-message">
            <h2>No books added to shelf yet!</h2>
            <p>
              Start exploring books and add them to your shelf by clicking the
              shelf icon.
            </p>
            <a href="/dashboard" className="browse-books-btn">
              Browse Books
            </a>
          </div>
        ) : (
          <div className="shelf-grid">
            {shelf.map((shelfItem) => {
              // Convert the stored shelf item back to the book format expected by BookCard
              const book = {
                id: shelfItem.book_id,
                volumeInfo: {
                  title: shelfItem.book_title,
                  authors: shelfItem.book_data?.volumeInfo?.authors || [
                    "Unknown Author",
                  ],
                  imageLinks: shelfItem.book_data?.volumeInfo?.imageLinks || {},
                  description:
                    shelfItem.book_data?.volumeInfo?.description || "",
                  publishedDate:
                    shelfItem.book_data?.volumeInfo?.publishedDate || "",
                  publisher: shelfItem.book_data?.volumeInfo?.publisher || "",
                  pageCount: shelfItem.book_data?.volumeInfo?.pageCount || 0,
                  categories: shelfItem.book_data?.volumeInfo?.categories || [],
                  averageRating:
                    shelfItem.book_data?.volumeInfo?.averageRating || 0,
                  ratingsCount:
                    shelfItem.book_data?.volumeInfo?.ratingsCount || 0,
                },
              };

              return (
                <BookCard
                  key={shelfItem.book_id}
                  book={book}
                  isFavorite={favoriteItems.has(book.id)}
                  toShelf={true} // Always true since this is the shelf page
                  onToggleFavorite={() => handleToggleToFavorites(book)}
                  onToggleToShelf={() => handleRemoveFromShelf(book)}
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

export default ShelfPage;
