// Centralized Axios instance for API calls
import axios from 'axios';

// Prefer env override, fall back to localhost for dev, or a known LAN IP if not localhost
const baseURL = import.meta.env?.VITE_API_BASE_URL
  || (window?.location?.hostname === 'localhost' ? 'http://localhost:3001' : 'http://10.190.0.174:3001');

const api = axios.create({ baseURL });

export default api;
