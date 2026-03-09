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

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        if (error.message === "Supabase not configured") {
          setError("Authentication is not configured. Please check your environment variables.");
        } else {
          setError(error.message);
        }
      } else if (data.user) {
        if (data.user.email_confirmed_at) {
          // User is already confirmed (OAuth or instant signup)
          localStorage.setItem("isNewAccount", "true");
          navigate("/dashboard");
        } else {
          // Email confirmation required
          setSuccess("Success! Check your email for the confirmation link to complete your registration.");
        }
      } else {
        setError("Registration failed. Please try again.");
      }
    } catch (err) {
      if (err.message === "Supabase not configured") {
        setError("Authentication is not configured. Please check your environment variables.");
      } else {
        setError("An unexpected error occurred. Please try again.");
        console.error("Registration error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setSuccess("");

    try {
      // Set a flag to indicate this is a new account
      localStorage.setItem("isNewAccount", "true");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
        // Remove the flag if there was an error
        localStorage.removeItem("isNewAccount");
      }
      // Note: OAuth redirects, so we don't set success message here
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Google sign up error:", err);
      localStorage.removeItem("isNewAccount");
    }
  };

  return (
    <div className="register-container">
      <div className="register-header">
        <h1>Join Inkspire</h1>
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
