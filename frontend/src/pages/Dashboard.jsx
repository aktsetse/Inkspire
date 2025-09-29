import "./Dashboard.css";
import Search from "../Search";
import BookList from "../BookList";
import Sidebar from "../components/FavoritesSidebar";
import CelebrityList from "../components/CelebrityList";
import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../App";
import BookModal from "../BookModal";

function Dashboard() {
  // books is the list of results received from the Search component
  // setBooks is a function to update the list of results
  const [books, setBooks] = useState([]);
  const [isShowingHotPicks, setIsShowingHotPicks] = useState(true);
  const [joinedDiscussions, setJoinedDiscussions] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bookId } = useParams(); // Get bookId from URL if coming from notification
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  // Get comment ID from URL and pass it to the BookModal component
  const highlightedCommentId = searchParams.get("comment");

  // Fetch book details if coming from a notification
  useEffect(() => {
    if (bookId) {
      fetchBookDetails(bookId);
    }
  }, [bookId]);

  const fetchBookDetails = async (id) => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`
      );

      if (response.ok) {
        const bookData = await response.json();
        setSelectedBook(bookData);
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error fetching book details:", error);
    }
  };

  // Popular book categories that rotate
  const hotPicksCategories = [
    "bestseller fiction",
    "popular science",
    "mystery thriller",
    "romance novels",
    "fantasy adventure",
    "biography memoir",
    "self help",
    "young adult",
    "historical fiction",
    "contemporary literature",
  ];

  // Load hot picks on component mount only
  useEffect(() => {
    loadHotPicks();
  }, []);

  // Load user's joined discussions from database
  useEffect(() => {
    if (user) {
      loadJoinedDiscussions();
    } else {
      setJoinedDiscussions([]);
    }
  }, [user]);

  const loadJoinedDiscussions = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/user-channels/user/${user.id}`);
      if (response.ok) {
        const discussions = await response.json();
        setJoinedDiscussions(discussions);
      } else {
        setJoinedDiscussions([]);
      }
    } catch (error) {
      console.error("Error loading joined discussions:", error);
      setJoinedDiscussions([]);
    }
  };

  // Set up rotation interval when showing hot picks
  useEffect(() => {
    if (!isShowingHotPicks) return;

    // Rotate hot picks every 30 minutes (1800000 ms)
    const interval = setInterval(() => {
      loadHotPicks();
    }, 1800000);

    return () => clearInterval(interval);
  }, [isShowingHotPicks]);

  const loadHotPicks = async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

    // Select a random category
    const randomCategory =
      hotPicksCategories[Math.floor(Math.random() * hotPicksCategories.length)];

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          randomCategory
        )}&orderBy=relevance&key=${apiKey}&maxResults=40`
      );
      const data = await response.json();

      const hotPicks = data.items || [];

      // Filter out books that don't have preview images
      const booksWithImages = hotPicks.filter((book) => {
        return (
          book.volumeInfo?.imageLinks &&
          Object.keys(book.volumeInfo.imageLinks).length > 0
        );
      });

      // Shuffle the results to add more randomness
      const shuffledPicks = booksWithImages.sort(() => Math.random() - 0.5);

      setBooks(shuffledPicks);
      setIsShowingHotPicks(true);
    } catch (error) {
      console.error("Error fetching hot picks:", error);
      setBooks([]);
    }
  };

  const handleResults = (results) => {
    if (results.length === 0) {
      // Search was cleared, return to hot picks
      loadHotPicks();
    } else {
      // User searched and got results
      setBooks(results);
      setIsShowingHotPicks(false);
    }
  };

  const refreshHotPicks = () => {
    loadHotPicks();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleJoinDiscussion = async (book) => {
    if (!user) {
      alert("Please sign in to join discussions");
      return;
    }

    const { title } = book.volumeInfo;

    // Check if already joined
    const existingDiscussion = joinedDiscussions.find(
      (item) => item.id === book.id
    );

    try {
      if (existingDiscussion) {
        // Leave discussion
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
          // Remove from local state
          setJoinedDiscussions((prev) =>
            prev.filter((item) => item.id !== book.id)
          );
        } else {
          console.error("Failed to leave discussion");
        }
      } else {
        // Join discussion
        const response = await fetch("/api/user-channels/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            bookId: book.id,
            bookTitle: title,
            bookData: book,
          }),
        });

        if (response.ok) {
          const newDiscussion = await response.json();
          // Add to local state
          setJoinedDiscussions((prev) => [...prev, newDiscussion]);
        } else {
          console.error("Failed to join discussion");
        }
      }
    } catch (error) {
      console.error("Error handling discussion:", error);
    }
  };

  const handleLeaveDiscussion = async (discussionId, event) => {
    event.stopPropagation(); // Prevent navigation when clicking leave button

    if (!user) return;

    try {
      const response = await fetch("/api/user-channels/leave", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          bookId: discussionId,
        }),
      });

      if (response.ok) {
        // Remove from local state
        setJoinedDiscussions((prev) =>
          prev.filter((item) => item.id !== discussionId)
        );
      } else {
        console.error("Failed to leave discussion");
      }
    } catch (error) {
      console.error("Error leaving discussion:", error);
    }
  };

  const handleNavigateToDiscussion = (discussionId) => {
    navigate(`/discussion/${discussionId}`);
  };

  const isBookJoined = (bookId) => {
    return joinedDiscussions.some((item) => item.id === bookId);
  };

  // Handle closing the book modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBook(null);

    // If we came from a notification, redirect to the dashboard without the comment parameter
    if (bookId) {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <button className="previous-btn" onClick={() => navigate("/")}>
          ❮ Previous
        </button>
        <h1 className="page-header">Dashboard</h1>
        {user ? (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <div style={{ width: "80px" }}></div>
        )}
      </div>

      {/* Book Modal for comment notifications */}
      {showModal && selectedBook && (
        <BookModal
          book={selectedBook}
          onClose={handleCloseModal}
          onJoinDiscussion={handleJoinDiscussion}
          isJoined={isBookJoined(selectedBook.id)}
          highlightedCommentId={highlightedCommentId}
        />
      )}

      <Search onResults={handleResults} />

      {/* Popular Picks Header */}
      {isShowingHotPicks && (
        <div className="hot-picks-header">
          <h2>Popular Picks</h2>
        </div>
      )}

      <div className="page-layout">
        <aside className="left-sidebar">
          <Sidebar />
        </aside>

        <main className="main-content">
          {/* Book List Section */}
          <BookList
            books={books}
            onJoinDiscussion={handleJoinDiscussion}
            isBookJoined={isBookJoined}
          />
        </main>

        <div className="right-section">
          <button onClick={refreshHotPicks} className="refresh-btn">
            🔄 Refresh Picks
          </button>

          <aside className="right-sidebar">
            <div className="joined-discussions">
              <h3>Joined Discussions</h3>
              {joinedDiscussions.length === 0 ? (
                <p>No discussions joined yet</p>
              ) : (
                <ul>
                  {joinedDiscussions.map((discussion) => (
                    <li
                      key={discussion.id}
                      className="discussion-item"
                      onClick={() => handleNavigateToDiscussion(discussion.id)}
                      title="Click to open discussion"
                    >
                      <span className="discussion-text">
                        {discussion.displayText}
                      </span>
                      <button
                        className="leave-discussion-btn"
                        onClick={(e) => handleLeaveDiscussion(discussion.id, e)}
                        title="Leave discussion"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Celebrity List Component */}
            <CelebrityList />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
