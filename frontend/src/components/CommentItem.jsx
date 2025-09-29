import { useEffect, useRef } from "react";
import "./CommentItem.css";

// Recursive comment component that can render comments at any nesting level
const CommentItem = ({
  comment,
  formatTime,
  handleReply,
  nestingLevel = 0,
  highlightedCommentId,
  registerRef,
}) => {
  const commentRef = useRef(null);

  // Register this comment's ref with the parent component
  useEffect(() => {
    if (registerRef && commentRef.current) {
      registerRef(comment.id, commentRef);
    }
  }, [comment.id, registerRef]);

  // Scroll to this comment if it's highlighted
  useEffect(() => {
    if (highlightedCommentId === comment.id && commentRef.current) {
      commentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      // Add a temporary highlight class
      commentRef.current.classList.add("highlighted-comment");

      // Remove the highlight class after a few seconds
      const timer = setTimeout(() => {
        if (commentRef.current) {
          commentRef.current.classList.remove("highlighted-comment");
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [highlightedCommentId, comment.id]);
  // Calculate class names based on nesting level
  const getReplyContainerClass = () => {
    return `replies-container${nestingLevel > 0 ? " nested-replies" : ""}${
      nestingLevel > 1 ? " deep-nested-replies" : ""
    }`;
  };

  const getReplyClass = () => {
    return `reply${nestingLevel > 0 ? " nested-reply" : ""}${
      nestingLevel > 1 ? " deep-nested-reply" : ""
    }`;
  };

  const getAvatarClass = () => {
    if (nestingLevel === 0) return "author-avatar";
    if (nestingLevel === 1) return "author-avatar reply-avatar";
    if (nestingLevel === 2) return "author-avatar nested-reply-avatar";
    return "author-avatar deep-nested-reply-avatar";
  };

  const getReplyBtnClass = () => {
    if (nestingLevel === 0) return "reply-btn";
    if (nestingLevel === 1) return "reply-btn nested-reply-btn";
    return "reply-btn deep-nested-reply-btn";
  };

  // Function to get display name from user data
  const getDisplayName = (user) => {
    // First try to use first_name if available
    if (user?.first_name) {
      return user.first_name;
    }

    // If no first_name, use the part of email before @
    if (user?.email) {
      return user.email.split("@")[0];
    }

    // Fallback to Anonymous
    return "Anonymous";
  };

  // Function to get avatar letter
  const getAvatarLetter = (user) => {
    // First try to use first letter of first_name
    if (user?.first_name && user.first_name.length > 0) {
      return user.first_name[0].toUpperCase();
    }

    // If no first_name, use first letter of email
    if (user?.email && user.email.length > 0) {
      return user.email[0].toUpperCase();
    }

    // Fallback to "A" for Anonymous
    return "A";
  };

  return (
    <div
      ref={commentRef}
      className={nestingLevel === 0 ? "comment" : getReplyClass()}
    >
      <div className="comment-header">
        <div className="comment-author">
          <div className={getAvatarClass()}>
            {getAvatarLetter(comment.user)}
          </div>
          <span className="author-name">{getDisplayName(comment.user)}</span>
        </div>
        <span className="comment-time">{formatTime(comment.createdAt)}</span>
      </div>
      <div className="comment-content">{comment.content}</div>
      <div className="comment-actions">
        <button
          className={getReplyBtnClass()}
          onClick={() => handleReply(comment)}
          aria-label="Reply to comment"
        >
          <span className="reply-icon">💬</span>
          <span className="reply-text">
            Reply
            {comment.replies && comment.replies.length > 0 && (
              <span className="reply-count">{comment.replies.length}</span>
            )}
          </span>
        </button>
      </div>

      {/* Recursively render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={getReplyContainerClass()}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              formatTime={formatTime}
              handleReply={handleReply}
              nestingLevel={nestingLevel + 1}
              highlightedCommentId={highlightedCommentId}
              registerRef={registerRef}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
