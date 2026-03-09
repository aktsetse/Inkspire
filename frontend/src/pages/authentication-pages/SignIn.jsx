import { useState } from "react";
import { supabase } from "../../../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./SignIn.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Clear any existing new account flag
        localStorage.removeItem("isNewAccount");
        navigate("/dashboard");
      } else {
        setError("Sign in failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
      }
      // Note: OAuth redirects, so we don't navigate here
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Google sign in error:", err);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-header">
        <h1>Welcome Back</h1>
        <p>Sign in to your Inkspire account</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="signin-form" onSubmit={handleSignIn}>
        <input
          className="signin-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="signin-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="signin-button" type="submit" disabled={loading}>
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <div className="signin-divider">
        <span>or</span>
      </div>

      <button
        className="google-signin-button"
        onClick={handleGoogleLogin}
        type="button"
      >
        Continue with Google
      </button>

      <div className="signin-footer">
        <p>
          Don't have an account? <a href="/register">Sign Up</a>
        </p>
      </div>
    </div>
  );
}
