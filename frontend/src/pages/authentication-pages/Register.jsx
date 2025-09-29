import { useState } from "react";
import { supabase } from "../../../utils/supabaseClient";
import { Link } from "react-router-dom";
import "./Register.css";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "http://localhost:5173/dashboard",
      },
    });

    if (error) {
      setError(error.message);
    } else {
      // Set a flag to indicate this is a new account
      localStorage.setItem("isNewAccount", "true");
      setSuccess("Success! Check your email for the confirmation link.");
    }

    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setError("");

    // Set a flag to indicate this is a new account
    localStorage.setItem("isNewAccount", "true");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:5173/dashboard",
      },
    });

    if (error) {
      setError(error.message);
      // Remove the flag if there was an error
      localStorage.removeItem("isNewAccount");
    }
  };

  return (
    <div className="register-container">
      <div className="register-header">
        <h1>Join StoryStack</h1>
        <p>Create your account and start your reading journey</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="password-requirements">
        <h4>Password Requirements:</h4>
        <ul>
          <li>At least 6 characters long</li>
          <li>Mix of letters and numbers recommended</li>
        </ul>
      </div>

      <form className="register-form" onSubmit={handleSignUp}>
        <input
          className="register-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="register-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength="6"
        />

        <button className="register-button" type="submit" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <div className="register-divider">
        <span>or</span>
      </div>

      <button
        className="google-signup-button"
        type="button"
        onClick={handleGoogleSignUp}
      >
        Continue with Google
      </button>

      <div className="register-footer">
        <p>
          Already have an account? <Link to="/signin">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
