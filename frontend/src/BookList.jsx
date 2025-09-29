import "./BookList.css";
import BookCard from "./BookCard";
import { useState, useEffect } from "react";
import { useAuth } from "./App";

function BookList({
  books,
  onFavoritesUpdate,
  onJoinDiscussion,
  isBookJoined,
}) {
  const [favorites, setFavorites] = useState(new Set());
  const [shelfItems, setShelfItems] = useState(new Set());
  const { user } = useAuth();

  // Load user's favorites and shelf items from database
  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      // Clear data when user logs out
      setFavorites(new Set());
      setShelfItems(new Set());
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) {
      return;
    }

    try {
      // Load favorites
      const favoritesUrl = `http://localhost:3000/api/favorites/${user.id}`;

      const favoritesResponse = await fetch(favoritesUrl);

      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json();
        const favoriteIds = new Set(favoritesData.map((fav) => fav.book_id));
        setFavorites(favoriteIds);
      } else {
        setFavorites(new Set());
      }

      // Load shelf items
      const shelfUrl = `http://localhost:3000/api/shelf/${user.id}`;

      const shelfResponse = await fetch(shelfUrl);

      if (shelfResponse.ok) {
        const shelfData = await shelfResponse.json();
        const shelfIds = new Set(shelfData.map((item) => item.book_id));
        setShelfItems(shelfIds);
      } else {
        setShelfItems(new Set());
      }
    } catch (error) {
      setFavorites(new Set());
      setShelfItems(new Set());
    }
  };

  const handleToggleFavorite = async (book) => {
    if (!user) {
      alert("Please sign in to add favorites");
      return;
    }

    const bookId = book.id;
    const isFavorited = favorites.has(bookId);

    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await fetch("http://localhost:3000/api/favorites", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supabase_id: user.id,
            book_id: bookId,
          }),
        });

        if (response.ok) {
          setFavorites((prev) => {
            const newFavorites = new Set(prev);
            newFavorites.delete(bookId);
            return newFavorites;
          });

          // Notify parent component to refresh favorites sidebar
          if (onFavoritesUpdate) {
            onFavoritesUpdate();
          }
        } else {
          alert("Failed to remove from favorites. Please try again.");
        }
      } else {
        // Add to favorites
        const response = await fetch("http://localhost:3000/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supabase_id: user.id,
            book_id: bookId,
            book_title: book.volumeInfo.title,
            book_data: book,
          }),
        });

        if (response.ok) {
          setFavorites((prev) => {
            const newFavorites = new Set(prev);
            newFavorites.add(bookId);
            return newFavorites;
          });

          // Notify parent component to refresh favorites sidebar
          if (onFavoritesUpdate) {
            onFavoritesUpdate();
          }
        } else {
          alert("Failed to add to favorites. Please try again.");
        }
      }
    } catch (error) {
      alert("Network error. Please check your connection and try again.");
    }
  };

  const handleToggleToShelf = async (book) => {
    if (!user) {
      alert("Please sign in to add to shelf");
      return;
    }

    const bookId = book.id;
    const isOnShelf = shelfItems.has(bookId);

    try {
      if (isOnShelf) {
        // Remove from shelf
        const response = await fetch("http://localhost:3000/api/shelf", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supabase_id: user.id,
            book_id: bookId,
          }),
        });

        if (response.ok) {
          setShelfItems((prev) => {
            const newShelfItems = new Set(prev);
            newShelfItems.delete(bookId);
            return newShelfItems;
          });
        } else {
          alert("Failed to remove from shelf. Please try again.");
        }
      } else {
        // Add to shelf
        const response = await fetch("http://localhost:3000/api/shelf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supabase_id: user.id,
            book_id: bookId,
            book_title: book.volumeInfo.title,
            book_data: book,
          }),
        });

        if (response.ok) {
          setShelfItems((prev) => {
            const newShelfItems = new Set(prev);
            newShelfItems.add(bookId);
            return newShelfItems;
          });
        } else {
          alert("Failed to add to shelf. Please try again.");
        }
      }
    } catch (error) {
      alert("Network error. Please check your connection and try again.");
    }
  };

  if (books.length === 0)
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );

  return (
    <div className="book-list">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          isFavorite={favorites.has(book.id)}
          toShelf={shelfItems.has(book.id)}
          onToggleFavorite={handleToggleFavorite}
          onToggleToShelf={handleToggleToShelf}
          onJoinDiscussion={onJoinDiscussion}
          isBookJoined={isBookJoined}
        />
      ))}
    </div>
  );
}

export default BookList;
