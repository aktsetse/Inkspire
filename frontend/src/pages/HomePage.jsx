import "./HomePage.css"
function HomePage(){
    return(
        <div className="homepage">
            <h1>StoryStack</h1>
            <div className="header">
             <h2> Welcome to StoryStack </h2>
             <p> A place to discover, discuss, and share your favorite books </p>
             </div>
                 <div className="homepage-info">
                    <p>Discover your next favorite read, share your thoughts, and join conversations that matter. </p>
                    With StoryStack, you can:

                     <ul>
                        <li>🔍 Search books from around the world</li>
                        <li>📖 Build your bookshelf — track what you’re reading, want to read, or have finished</li>
                        <li>💬 Join channels and discuss with fellow readers</li>
                        <li>⭐ Leave reviews, rate books, and see what others think</li>
                        <li>📝 Receive personalized book recommendations tailored to your interests</li>
                     </ul>

                 </div>




                <div className="homepage-register">
                <h3>Get Started</h3>
                <a href="/register" className="signup-link">Sign up</a>
                &nbsp;to build your personalized library and join the conversation.
                 </div>
        </div>
    )
}

export default HomePage;
