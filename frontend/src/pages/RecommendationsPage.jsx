import { useState, useEffect } from "react";
import { useAuth } from "../App";
import BookCard from "../BookCard";
import Sidebar from "../components/FavoritesSidebar";
import { useNavigate } from "react-router-dom";
import "./RecommendationsPage.css";
const recommendationsLimit = 20; // Number of recommendations to return

function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [shelfItems, setShelfItems] = useState(new Set());
  const [joinedChannels, setJoinedChannels] = useState(new Set());
  const { user } = useAuth();
  const navigate = useNavigate();

  // Track when recommendations were last checked
  const [lastChecked, setLastChecked] = useState(() => {
    // Try to get the last checked timestamp from localStorage
    const stored = localStorage.getItem("lastRecommendationCheck");
    return stored ? new Date(stored) : null;
  });

  useEffect(() => {
    if (user) {
      const now = new Date();
      let shouldNotify = false;

      // Check if it's been at least 24 hours since the last check
      // or if this is the first time checking
      if (!lastChecked || now - lastChecked > 24 * 60 * 60 * 1000) {
        shouldNotify = true;
        setLastChecked(now);
        localStorage.setItem("lastRecommendationCheck", now.toISOString());
      }

      // For new accounts, always trigger a recommendation notification
      const isNewAccount = localStorage.getItem("isNewAccount") === "true";
      if (isNewAccount) {
        console.log(
          "New account detected, triggering recommendation notification"
        );
        shouldNotify = true;
        localStorage.removeItem("isNewAccount"); // Clear the flag after use
      }

      loadRecommendations(shouldNotify);
      loadFavorites();
      loadShelfItems();
      loadJoinedChannels();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/favorites/${user.id}`);

      if (response.ok) {
        const favoritesData = await response.json();
        const favoriteIds = new Set(favoritesData.map((item) => item.book_id));
        setFavorites(favoriteIds);
      } else {
        setFavorites(new Set());
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
      setFavorites(new Set());
    }
  };

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
      console.error("Error loading shelf items:", error);
      setShelfItems(new Set());
    }
  };

  const handleToggleFavorite = async (book) => {
    if (!user) return;

    try {
      const isFavorite = favorites.has(book.id);

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
          setFavorites((prev) => {
            const newFavorites = new Set(prev);
            newFavorites.delete(book.id);
            return newFavorites;
          });
        } else {
          alert("Failed to remove from favorites. Please try again.");
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
          setFavorites((prev) => {
            const newFavorites = new Set(prev);
            newFavorites.add(book.id);
            return newFavorites;
          });
        } else {
          alert("Failed to add to favorites. Please try again.");
        }
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  const handleToggleToShelf = async (book) => {
    if (!user) return;

    try {
      const isOnShelf = shelfItems.has(book.id);

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
          setShelfItems((prev) => {
            const newShelfItems = new Set(prev);
            newShelfItems.delete(book.id);
            return newShelfItems;
          });
        } else {
          alert("Failed to remove from shelf. Please try again.");
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
          alert("Failed to leave discussion. Please try again.");
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
          alert("Failed to join discussion. Please try again.");
        }
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  const loadRecommendations = async (withNotification = false) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Add the notify parameter if requested
      const notifyParam = withNotification ? "?notify=true" : "";
      const response = await fetch(
        `/api/recommendations/${user.id}${notifyParam}`
      );

      if (response.ok) {
        const data = await response.json();

        // Check if we have topCategories to work with
        if (data.topCategories && data.topCategories.length > 0) {
          // Fetch books from Google Books API based on top categories
          const books = await fetchBooksFromCategories(data.topCategories);
          setRecommendations(books);
        } else {
          // No categories available, set empty recommendations
          setRecommendations([]);
        }
      } else {
        setError("Failed to load recommendations");
      }
    } catch (error) {
      console.error("Error loading recommendations:", error);
      setError("Error loading recommendations");
    } finally {
      setLoading(false);
    }
  };

  // Fisher-Yates shuffle algorithm
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchBooksFromCategories = async (topCategories) => {
    const allBooks = [];

    try {
      // Ensure we have at least one category
      if (!topCategories || topCategories.length === 0) {
        console.error("No categories available for recommendations");
        return [];
      }

      // Use all available categories (up to 3)
      const categoriesToUse = topCategories.slice(0, 3);

      // Fetch books for each category
      for (const categoryData of categoriesToUse) {
        const category = categoryData.category;

        // Skip empty categories
        if (!category || category.trim() === "") {
          continue;
        }

        // Add some variety to the search query
        const searchQueries = [
          `subject:${category}`,
          `subject:${category}+fiction`,
          `subject:${category}+bestseller`,
        ];

        // Use a different query for each category to increase variety
        const queryIndex =
          categoriesToUse.indexOf(categoryData) % searchQueries.length;
        const searchQuery = searchQueries[queryIndex];

        try {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
              searchQuery
            )}&maxResults=15&orderBy=relevance`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
              // Filter out books without essential information
              const validBooks = data.items.filter(
                (book) =>
                  book.volumeInfo &&
                  book.volumeInfo.title &&
                  book.volumeInfo.authors &&
                  book.volumeInfo.imageLinks
              );

              allBooks.push(...validBooks);
            } else {
              console.log(`No books found for category: ${category}`);
            }
          } else {
            console.error(`Failed to fetch books for category: ${category}`);
          }
        } catch (categoryError) {
          console.error(
            `Error fetching books for category ${category}:`,
            categoryError
          );
          // Continue with other categories even if one fails
        }
      }

      // If we still don't have enough books, try a general search
      if (allBooks.length < 5) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=bestsellers&maxResults=20`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.items) {
              allBooks.push(...data.items);
            }
          }
        } catch (fallbackError) {
          console.error("Error fetching fallback books:", fallbackError);
        }
      }

      // Remove duplicates
      const uniqueBooks = allBooks.filter(
        (book, index, self) => index === self.findIndex((b) => b.id === book.id)
      );

      // Shuffle the books to randomize the order
      const shuffledBooks = shuffleArray(uniqueBooks).slice(
        0,
        recommendationsLimit
      );

      return shuffledBooks;
    } catch (error) {
      console.error("Error fetching books from Google Books API:", error);
      return [];
    }
  };

  if (!user) {
    return (
      <div className="recommendations-page">
        <Sidebar />
        <div className="recommendations-content">
          <h1>Please sign in to view recommendations</h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="recommendations-page">
        <Sidebar />
        <div className="recommendations-content">
          <h1>Loading recommendations...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommendations-page">
        <Sidebar />
        <div className="recommendations-content">
          <h1>Error: {error}</h1>
          <button onClick={loadRecommendations}>Try Again</button>
        </div>
      </div>
    );
  }

  // Function to manually shuffle the recommendations with animation
  const handleShuffle = () => {
    // Add shuffling class to trigger animation
    const gridElement = document.querySelector(".recommendations-grid");
    if (gridElement) {
      gridElement.classList.add("shuffling");

      // Remove the class after animation completes
      setTimeout(() => {
        gridElement.classList.remove("shuffling");
      }, 500); // Match the animation duration
    }

    // Shuffle the recommendations
    setRecommendations(shuffleArray([...recommendations]));
  };

  return (
    <div className="recommendations-page">
      <Sidebar />
      <div className="recommendations-content">
        <div className="recommendations-header">
          <h1>Recommended Books For You!</h1>
          <div className="recommendations-actions">
            {recommendations.length > 0 && (
              <button className="shuffle-button" onClick={handleShuffle}>
                <span className="shuffle-icon">🔀</span> Shuffle
              </button>
            )}
          </div>
        </div>
        {recommendations.length === 0 ? (
          <div className="no-recommendations">
            <p>No recommendations available yet.</p>
            <p>
              Add some books to your favorites or shelf to get personalized
              recommendations!
            </p>
          </div>
        ) : (
          <div className="recommendations-grid">
            {recommendations.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isFavorite={favorites.has(book.id)}
                toShelf={shelfItems.has(book.id)}
                onToggleFavorite={handleToggleFavorite}
                onToggleToShelf={handleToggleToShelf}
                onJoinDiscussion={handleJoinDiscussion}
                isJoined={joinedChannels.has(book.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecommendationsPage;
