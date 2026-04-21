const normalizeApiUrl = (url) => {
    const fallback = 'http://localhost:5000';
    const rawUrl = (url || fallback).trim();
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
    return withProtocol.endsWith('/') ? withProtocol : `${withProtocol}/`;
};

const API_URL = normalizeApiUrl(process.env.REACT_APP_API_URL);

export default API_URL;
