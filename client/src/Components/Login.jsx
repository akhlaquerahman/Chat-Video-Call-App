import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import API_URL from '../apiConfig';
import '../Styles/ModernAuth.css';

const Login = ({ setToken }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API_URL}api/auth/login`, formData);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
    } catch (err) {
      console.error(err.response?.data);
      setError(err.response?.data?.msg || 'Login failed! Please check your credentials.');
      setLoading(false);
    }
  };

  const onGoogleSuccess = async (response) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}api/auth/google-login`, {
        tokenId: response.credential,
      });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
    } catch (err) {
      console.error(err.response?.data);
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleError = () => {
    setError('Google login was unsuccessful.');
  };

  return (
    <div className="auth-page">
      <div className={`auth-card ${error ? 'shake' : ''}`}>
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Login to continue chatting with your friends</p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-wrapper">
              <input
                type="email"
                className="form-input"
                placeholder="abc@gmail.com"
                name="email"
                value={email}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="form-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Enter your password"
                name="password"
                value={password}
                onChange={onChange}
                required
              />
              <span 
                className="password-toggle" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </span>
            </div>
          </div>

          {error && <p className="mb-3 text-center" style={{color: 'var(--wa-error)', fontSize: '14px'}}>{error}</p>}

          <Link to="/forgot-password" style={{fontSize: '13px'}} className="forgot-password">
            Forgot password?
          </Link>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <div className="loading-spinner"></div> : "Login"}
          </button>
        </form>

        <div className="social-login">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={onGoogleError}
            useOneTap
            theme="filled_blue"
            shape="pill"
            width="100%"
          />
        </div>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
