import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import API_URL from '../apiConfig';
import '../Styles/ModernAuth.css';

const Register = ({ setToken }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: ''
    });
    const [profileImg, setProfileImg] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [strength, setStrength] = useState('');
    const [agreed, setAgreed] = useState(false);
    
    // OTP States
    const [showOTP, setShowOTP] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    const { username, email, phoneNumber, password, confirmPassword } = formData;
    const navigate = useNavigate();

    const checkPasswordStrength = (pass) => {
        if (!pass) return '';
        if (pass.length < 6) return 'weak';
        if (pass.length < 10) return 'medium';
        return 'strong';
    };

    useEffect(() => {
        setStrength(checkPasswordStrength(password));
    }, [password]);

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImg(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match!');
            return;
        }
        if (!agreed) {
            setError('Please agree to the Terms & Conditions.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const form = new FormData();
            form.append('username', username);
            form.append('email', email);
            form.append('phoneNumber', phoneNumber);
            form.append('password', password);
            if (profileImg) {
                form.append('profileImg', profileImg);
            }
            
            await axios.post(`${API_URL}api/auth/register`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            
            setLoading(false);
            setShowOTP(true);
        } catch (err) {
            console.error(err.response?.data);
            setError(err.response?.data?.msg || 'Registration failed!');
            setLoading(false);
        }
    };

    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const res = await axios.post(`${API_URL}api/auth/verify-otp`, {
                email,
                otp: otpCode
            });
            
            localStorage.setItem('token', res.data.token);
            if (setToken) setToken(res.data.token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.msg || 'Verification failed!');
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
            if (setToken) setToken(res.data.token);
            navigate('/');
        } catch (err) {
            setError('Google registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const isValid = (field) => {
        if (!formData[field]) return null;
        if (field === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (field === 'username') return username.length >= 3;
        if (field === 'password') return password.length >= 6;
        if (field === 'confirmPassword') return confirmPassword === password && password.length > 0;
        return true;
    };

    if (showOTP) {
        return (
            <div className="auth-page">
                <div className={`auth-card ${error ? 'shake' : ''}`} style={{maxWidth: '400px'}}>
                    <div className="auth-header">
                        <h1>Verify Email</h1>
                        <p>We've sent a 6-digit code to <strong>{email}</strong></p>
                    </div>

                    <form onSubmit={handleOTPSubmit}>
                        <div className="form-group">
                            <label className="form-label">Verification Code</label>
                            <input
                                type="text"
                                className="form-input text-center"
                                style={{letterSpacing: '8px', fontSize: '24px', fontWeight: 'bold'}}
                                placeholder="000000"
                                maxLength="6"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                required
                            />
                        </div>

                        {error && <p className="mb-3 text-center" style={{color: 'var(--wa-error)', fontSize: '14px'}}>{error}</p>}

                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? <div className="loading-spinner"></div> : "Verify & Register"}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Didn't receive a code? <a href="#!" onClick={(e) => { e.preventDefault(); onSubmit(e); }}>Resend</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className={`auth-card ${error ? 'shake' : ''}`} style={{maxWidth: '500px'}}>
                <div className="auth-header">
                    <h1>Create Account</h1>
                    <p>Join our community today</p>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="avatar-upload">
                        <label htmlFor="profile-upload" className="avatar-preview">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" />
                            ) : (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#667781" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            )}
                            <div className="camera-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                            </div>
                        </label>
                        <input 
                            id="profile-upload" 
                            type="file" 
                            hidden 
                            onChange={handleFileChange} 
                            accept="image/*" 
                        />
                        <span style={{fontSize: '12px', color: '#667781', marginTop: '8px'}}>Upload Photo</span>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <div className="form-input-wrapper">
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="John Doe"
                                        name="username"
                                        value={username}
                                        onChange={onChange}
                                        required
                                    />
                                    {isValid('username') !== null && (
                                        <span className={`validation-icon ${isValid('username') ? 'valid' : 'invalid'}`}>
                                            {isValid('username') ? '✓' : '✕'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                             <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <div className="form-input-wrapper">
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="+1 234 567 890"
                                        name="phoneNumber"
                                        value={phoneNumber}
                                        onChange={onChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="form-input-wrapper">
                            <input
                                type="email"
                                className="form-input"
                                placeholder="john@example.com"
                                name="email"
                                value={email}
                                onChange={onChange}
                                required
                            />
                            {isValid('email') !== null && (
                                <span className={`validation-icon ${isValid('email') ? 'valid' : 'invalid'}`}>
                                    {isValid('email') ? '✓' : '✕'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="form-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-input"
                                placeholder="Min. 6 characters"
                                name="password"
                                value={password}
                                onChange={onChange}
                                required
                            />
                            <span 
                                className="password-toggle" 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{right: '12px'}}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </span>
                        </div>
                        {password && (
                            <div className="password-strength">
                                <div className={`strength-bar strength-${strength}`}></div>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <div className="form-input-wrapper">
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Re-enter password"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={onChange}
                                required
                            />
                             {isValid('confirmPassword') !== null && (
                                <span className={`validation-icon ${isValid('confirmPassword') ? 'valid' : 'invalid'}`}>
                                    {isValid('confirmPassword') ? '✓' : '✕'}
                                </span>
                            )}
                        </div>
                    </div>

                    {error && <p className="mb-3 text-center" style={{color: 'var(--wa-error)', fontSize: '14px'}}>{error}</p>}

                    <div className="terms-checkbox">
                        <input 
                            type="checkbox" 
                            id="terms" 
                            checked={agreed} 
                            onChange={(e) => setAgreed(e.target.checked)} 
                        />
                        <label htmlFor="terms" style={{fontSize: '13px'}}>
                            I agree to the <a href="#!" onClick={(e) => e.preventDefault()}>Terms & Conditions</a>.
                        </label>
                    </div>

                    <button type="submit" className="auth-btn" style={{marginTop: '10px'}} disabled={loading}>
                        {loading ? <div className="loading-spinner"></div> : "Register"}
                    </button>
                </form>

                <div className="social-login" style={{marginTop: '20px'}}>
                    <GoogleLogin
                        onSuccess={onGoogleSuccess}
                        onError={() => setError('Google login failed')}
                        text="signup_with"
                        shape="pill"
                        width="100%"
                    />
                </div>

                <div className="auth-footer">
                    Already have an account? <Link to="/">Login</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
