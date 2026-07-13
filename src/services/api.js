import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'c',
  withCredentials: true,
});

export default api;