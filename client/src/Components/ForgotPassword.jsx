import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import API_URL from '../apiConfig';
import '../Styles/ModernAuth.css';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post(`${API_URL}api/auth/forgot-password`, { email });
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleOTPSubmit = (e) => {
        e.preventDefault();
        if (otp.length === 6) {
            setStep(3);
            setError('');
        } else {
            setError('Please enter a valid 6-digit OTP');
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await axios.post(`${API_URL}api/auth/reset-password`, {
                email,
                otp,
                newPassword: passwords.newPassword
            });
            alert('Password reset successful! Please login.');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className={`auth-card ${error ? 'shake' : ''}`} style={{maxWidth: '400px'}}>
                <div className="auth-header">
                    <h1>Reset Password</h1>
                    <p>
                        {step === 1 && "Enter your email to receive a verification code"}
                        {step === 2 && `Enter the 6-digit code sent to ${email}`}
                        {step === 3 && "Create a new strong password for your account"}
                    </p>
                </div>

                {step === 1 && (
                    <form onSubmit={handleEmailSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="mb-3 text-center" style={{color: 'var(--wa-error)', fontSize: '14px'}}>{error}</p>}
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? <div className="loading-spinner"></div> : "Send OTP"}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleOTPSubmit}>
                        <div className="form-group">
                            <label className="form-label">Verification Code</label>
                            <input
                                type="text"
                                className="form-input text-center"
                                style={{letterSpacing: '8px', fontSize: '24px', fontWeight: 'bold'}}
                                placeholder="000000"
                                maxLength="6"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="mb-3 text-center" style={{color: 'var(--wa-error)', fontSize: '14px'}}>{error}</p>}
                        <button type="submit" className="auth-btn">Verify Code</button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handlePasswordSubmit}>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="At least 6 characters"
                                value={passwords.newPassword}
                                onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                                required
                                minLength="6"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Repeat new password"
                                value={passwords.confirmPassword}
                                onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                                required
                            />
                        </div>
                        {error && <p className="mb-3 text-center" style={{color: 'var(--wa-error)', fontSize: '14px'}}>{error}</p>}
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? <div className="loading-spinner"></div> : "Update Password"}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    Remembered your password? <Link to="/">Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
