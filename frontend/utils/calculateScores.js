
import scoreWeights from '../../backend/routes/category-scores.js'

// Helper function to extract categories from book data
const getBookCategories = (book) => {
    // Handle different data sources
    if (book.category) return book.category; // From database
    if (book.volumeInfo?.categories) return book.volumeInfo.categories; // From Google API
    if (book.categories) return book.categories;
    if (book.book_data?.volumeInfo?.categories) return book.book_data.volumeInfo.categories; // From stored book_data
    return [];
};

// Helper function to extract categories from channel data
const getChannelCategories = (channel) => {
    // Channels are based on books, so extract categories from the book data
    if (channel.book_data?.volumeInfo?.categories) return channel.book_data.volumeInfo.categories;
    if (channel.book_data?.categories) return channel.book_data.categories;
    return [];
};

// Calculate category scores for a user based on their interactions
export async function calculateAndUpdateScores(userId) {
    try {
        // Fetch user's data from the backend
        const [favoritesRes, shelfRes, commentsRes, channelsRes] = await Promise.all([
            fetch(`http://localhost:3000/api/favorites/${userId}`),
            fetch(`http://localhost:3000/api/shelf/${userId}`),
            fetch(`http://localhost:3000/api/comments/user/${userId}`),
            fetch(`http://localhost:3000/api/user-channels/user/${userId}`)
        ]);

        const favorites = favoritesRes.ok ? await favoritesRes.json() : [];
        const shelfItems = shelfRes.ok ? await shelfRes.json() : [];
        const comments = commentsRes.ok ? await commentsRes.json() : [];
        const channels = channelsRes.ok ? await channelsRes.json() : [];

        // Calculate scores locally
        const categoryScores = calculateScores({
            favorites,
            shelfItems,
            comments,
            channels
        });

        // Update scores in the database
        await updateCategoryScoresInDB(userId, categoryScores);

        return categoryScores;
    } catch (error) {
        console.error('Error calculating and updating scores:', error);
        throw error;
    }
}

// Local calculation function (updated to handle channels correctly)
export function calculateScores({
    favorites = [],
    shelfItems = [],
    comments = [],
    channels = []
}) {
    const categoryScores = {};

    const addPoints = (categories, points) => {
        if (!categories) return;

        // Handle both string and array formats
        const categoryList = Array.isArray(categories) ? categories : [categories];

        categoryList.forEach(category => {
            const normalizedCategory = category.trim().toLowerCase();
            categoryScores[normalizedCategory] = (categoryScores[normalizedCategory] || 0) + points;
        });
    };

    // Add 5 points for each favorited book
    favorites.forEach(book => addPoints(getBookCategories(book), scoreWeights.favorite));

    // Add 4 points for each book in the shelf
    shelfItems.forEach(book => addPoints(getBookCategories(book), scoreWeights.shelf));

    // Add 3 point for each book a user has made a comment on
    comments.forEach(comment => {
        // Comments store book data, extract categories from it
        const bookData = comment.book_data || {};
        addPoints(getBookCategories(bookData), commentScore);
    });

    // Add 2 points for each channel joined (based on the book the channel discusses)
    channels.forEach(channel => addPoints(getChannelCategories(channel), scoreWeights.channel));

    return categoryScores;
}

// Update category scores in the database
async function updateCategoryScoresInDB(userId, categoryScores) {
    try {
        const response = await fetch('http://localhost:3000/api/category-scores/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                categoryScores
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update category scores');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating category scores in DB:', error);
        throw error;
    }
}

// Get user's top categories for recommendations
export async function getTopCategories(userId, limit = 5) {
    try {
        const response = await fetch(`http://localhost:3000/api/category-scores/${userId}?limit=${limit}`);

        if (!response.ok) {
            throw new Error('Failed to fetch top categories');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching top categories:', error);
        throw error;
    }
}

// Get book recommendations based on user's top categories
export async function getRecommendations(userId, limit = 20) {
    try {
        const topCategories = await getTopCategories(userId, 3); // Get top 3 categories

        if (topCategories.length === 0) {
            return [];
        }

        const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
        const recommendations = [];

        // Fetch books from each top category
        for (const categoryScore of topCategories) {
            const category = categoryScore.category;
            const booksPerCategory = Math.ceil(limit / topCategories.length);

            try {
                const response = await fetch(
                    `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(category)}&orderBy=relevance&key=${apiKey}&maxResults=${booksPerCategory}`
                );

                if (response.ok) {
                    const data = await response.json();
                    const books = data.items || [];

                    // Filter books with images and add category info
                    const booksWithImages = books
                        .filter(book => book.volumeInfo?.imageLinks)
                        .map(book => ({
                            ...book,
                            recommendationReason: `Based on your interest in ${category}`,
                            categoryScore: categoryScore.score
                        }));

                    recommendations.push(...booksWithImages);
                }
            } catch (error) {
                console.error(`Error fetching books for category ${category}:`, error);
            }
        }

        // Shuffle and limit results
        function shuffle(array) {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }
         const shuffledRecommendations = shuffle(recommendations);
         return shuffledRecommendations;
    } catch (error) {
        console.error('Error getting recommendations:', error);
        return [];
    }
}
