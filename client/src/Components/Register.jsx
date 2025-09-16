import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../Styles/AuthForm.css';

const API_URL = process.env.REACT_APP_API_URL;

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
    });
    const [profileImg, setProfileImg] = useState(null); // 💡 New state for file
    const { username, email, password } = formData;
    const navigate = useNavigate();

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    // 💡 New onChange handler for file input
    const handleFileChange = (e) => {
        setProfileImg(e.target.files[0]);
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            // 💡 Use FormData to send both text and file data
            const form = new FormData();
            form.append('username', username);
            form.append('email', email);
            form.append('password', password);
            if (profileImg) {
                form.append('profileImg', profileImg);
            }
            
            const res = await axios.post(`${API_URL}api/auth/register`, form, {
                headers: {
                    'Content-Type': 'multipart/form-data', // 💡 Set Content-Type header for file upload
                },
            });
            console.log(res.data);
            alert('Registration successful! Please log in.');
            navigate('/');
        } catch (err) {
            console.error(err.response.data);
            alert('Registration failed!');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card p-4 shadow">
                <h2 className="text-center mb-4">Register</h2>
                <form onSubmit={onSubmit}>
                    <div className="mb-3">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Username"
                            name="username"
                            value={username}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <input
                            type="email"
                            className="form-control"
                            placeholder="Email"
                            name="email"
                            value={email}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Password"
                            name="password"
                            value={password}
                            onChange={onChange}
                            required
                        />
                    </div>
                    {/* 💡 New file input for profile image */}
                    <div className="mb-3">
                        <label className="form-label">Profile Image (Optional)</label>
                        <input
                            type="file"
                            className="form-control"
                            name="profileImg"
                            onChange={handleFileChange}
                            accept="image/*"
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100 mb-3">
                        Register
                    </button>
                </form>
                <p className="text-center">
                    Already have an account? <Link to="/">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;