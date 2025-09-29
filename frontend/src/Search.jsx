import "./Search.css";

import { useState } from "react";

function Search({ onResults }) {
  const [query, setQuery] = useState(""); //query stores what's typed in the search bar
  const [loading, setLoading] = useState(false); // loading is used to show "Searching..." on the button while the API call runs

  const handleClear = () => {
    setQuery("");
    onResults([]); // Clear search results
  };
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    if (!query.trim()) return; // avoid empty searches

    setLoading(true); // Set loading to true to show "Searching..." on the button

    const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

    try {
      // Fetch books from the Google Books API
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&key=${apiKey}&maxResults=40`
      );
      const data = await response.json();

      const books = data.items || []; // Get the books from the response  or empty array if no books found

      onResults(books);
    } catch (err) {
      onResults([]); // If there's an error, show an empty array of books
    } finally {
      setLoading(false); // Set loading to false to hide "Searching..." on the button
    }
  };

  return (
    <div className="search-section">
      <form onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books...."
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
        <button
          className="clear-search"
          type="button"
          onClick={handleClear}
          aria-label="Clear Search"
        >
          <span className="close">&times;</span>
        </button>
      </form>
    </div>
  );
}

export default Search;
