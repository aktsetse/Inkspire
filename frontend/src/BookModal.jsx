import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { useLocation } from "react-router-dom";
import CommentItem from "./components/CommentItem";
import { refreshNotificationsEvent } from "./components/NotificationBell";
import "./BookModal.css";

function BookModal({
  book,
  onClose,
  onJoinDiscussion,
  isJoined,
  highlightedCommentId,
}) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedCommentIdState, setHighlightedCommentIdState] = useState(
    highlightedCommentId || null
  );

  // Update state when prop changes
  useEffect(() => {
    if (highlightedCommentId) {
      setHighlightedCommentIdState(highlightedCommentId);
    }
  }, [highlightedCommentId]);
  const location = useLocation();
  const commentsRef = useRef({});

  const {
    title,
    authors,
    imageLinks,
    description,
    previewLink,
    publisher,
    publishedDate,
    pageCount,
    averageRating,
    categories,
  } = book.volumeInfo;

  useEffect(() => {
    getCurrentUser();
    fetchComments();

    // Check if we need to highlight a specific comment (from notification)
    const searchParams = new URLSearchParams(location.search);
    const commentId = searchParams.get("comment");
    if (commentId) {
      setHighlightedCommentIdState(commentId);
    }
  }, [book.id, location.search]);

  // Function to register comment refs for scrolling
  const registerCommentRef = (id, ref) => {
    commentsRef.current[id] = ref;
  };

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        const response = await fetch(`/api/users/supabase/${user.id}`);
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser({
            id: user.id,
            supabase_id: user.id,
            first_name: user.user_metadata?.first_name || "Anonymous",
            email: user.email,
          });
        }
      } catch (error) {
        setUser({
          id: user.id,
          supabase_id: user.id,
          first_name: user.user_metadata?.first_name || "Anonymous",
          email: user.email,
        });
      }
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments/book/${book.id}`);
      if (response.ok) {
        const commentsData = await response.json();
        setComments(commentsData);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      // to make sure there is a numeric database user ID
      let userId = user.id;

      // If the user object has a supabase_id property, it means the Supabase ID
      // is being used and need to get the numeric database ID
      if (user.supabase_id) {
        // we already have the database user object with the correct ID
        userId = user.id;
      } else {
        // to get the database user ID from the supabase ID
        try {
          const userResponse = await fetch(`/api/users/supabase/${user.id}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userId = userData.id; // Get the numeric database ID
          } else {
            console.error(
              "Failed to get user data for comment:",
              userResponse.status
            );
            throw new Error("Failed to get user data");
          }
        } catch (error) {
          throw error;
        }
      }

      const commentData = {
        content: newComment,
        book_id: book.id,
        book_title: title,
        book_data: book,
        userId: userId,
      };

      // If replying to a comment, add the parentId
      if (replyingTo) {
        commentData.parentId = replyingTo.id;
      }


      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commentData),
      });

      if (response.ok) {
        const newReply = await response.json();

        // After creating a reply, fetch all comments again to get the updated structure
        await fetchComments();

        // Trigger notification refresh for all components
        window.dispatchEvent(refreshNotificationsEvent);
        console.log(
          "Dispatched refreshNotificationsEvent after adding comment"
        );

        setNewComment("");
        setShowCommentForm(false);
        setReplyingTo(null);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to get display name from user data
  const getDisplayName = (user) => {
    // use the part of email before @
    if (user?.email) {
      return user.email.split("@")[0];
    }

    // Fallback to Anonymous
    return "Anonymous";
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    setShowCommentForm(true);
    setNewComment(`@${getDisplayName(comment.user)} `);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
  };

  // Function to count total comments including all replies
  const countTotalComments = (commentsList) => {
    let total = 0;

    const countReplies = (comment) => {
      // Count this comment
      total++;

      // Count all replies recursively
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach((reply) => countReplies(reply));
      }
    };

    // Count all top-level comments and their replies
    commentsList.forEach((comment) => countReplies(comment));

    return total;
  };

  // Calculate total comment count including all replies
  const totalCommentCount = useMemo(() => {
    return countTotalComments(comments);
  }, [comments]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes < 1 ? "Just now" : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>

        {imageLinks?.thumbnail && (
          <img src={imageLinks.thumbnail} alt={title} className="book-cover" />
        )}

        <h2>{title}</h2>
        <p>
          <strong>{authors?.length > 1 ? "Authors:" : "Author:"}</strong>
          {authors?.length > 0 ? ` ${authors.join(", ")}` : " Unknown"}
        </p>
        <p>
          <strong>Publisher:</strong> {publisher || "N/A"}
        </p>
        <p>
          <strong>Page Count:</strong> {pageCount || "N/A"}
        </p>
        <p>
          <strong>Average Rating:</strong>{" "}
          {averageRating ? `${averageRating}/5` : "N/A"}
        </p>
        <p>
          <strong>Published:</strong>{" "}
          {publishedDate
            ? new Date(publishedDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "N/A"}
        </p>

        <p>
          <strong>
            {categories?.length > 1 ? "Categories:" : "Category:"}
          </strong>
          {categories?.length > 0 ? ` ${categories.join(", ")}` : " N/A"}
        </p>
        <div className="overview">
          <p>{description || "No description available."}</p>
        </div>

        <div className="modal-actions">
          <button
            className={`join-discussion ${isJoined ? "leave-discussion" : ""}`}
            onClick={() => {
              if (onJoinDiscussion) {
                onJoinDiscussion(book);
              }
            }}
          >
            {isJoined ? "Leave Discussion" : "Join Discussion"}
          </button>

          <button
            className="comment-btn"
            onClick={() => {
              setShowCommentForm(!showCommentForm);
              setReplyingTo(null);
            }}
          >
            💬 {showCommentForm ? "Cancel" : "Add Comment"}
          </button>
        </div>

        {showCommentForm && (
          <div className="comment-form">
            {replyingTo && (
              <div className="replying-to">
                <span>Replying to {getDisplayName(replyingTo.user)}</span>
                <button onClick={cancelReply} className="cancel-reply-btn">
                  ✕
                </button>
              </div>
            )}
            <form onSubmit={handleAddComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  replyingTo
                    ? "Write your reply..."
                    : "Share your thoughts about this book..."
                }
                className="comment-input"
                rows="3"
              />
              <div className="comment-form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowCommentForm(false);
                    setNewComment("");
                    setReplyingTo(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-comment-btn"
                  disabled={!newComment.trim() || loading}
                >
                  {loading
                    ? "Posting..."
                    : replyingTo
                    ? "Post Reply"
                    : "Post Comment"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="comments-section">
          <h3>
            {totalCommentCount}{" "}
            {totalCommentCount === 1 ? "Comment" : "Comments"}
          </h3>
          {comments.length === 0 ? (
            <p className="no-comments">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div className="comments-list">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  formatTime={formatTime}
                  handleReply={handleReply}
                  highlightedCommentId={highlightedCommentIdState}
                  registerRef={registerCommentRef}
                />
              ))}
            </div>
          )}
        </div>

        {previewLink && (
          <div className="preview-link">
            <a href={previewLink} target="_blank" rel="noopener noreferrer">
              📖 Preview on Google Books
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookModal;
