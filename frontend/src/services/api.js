import axios from 'axios';

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:8000' : '';

// Crea istanza axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere token alle richieste
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const enteId = sessionStorage.getItem('current_ente_id');
    if (enteId) {
      config.headers['X-Ente-Id'] = enteId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor per gestire token scaduto (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('ente_id');
      sessionStorage.removeItem('current_ente_id');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('current_ente');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (username, password) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  
  const response = await api.post('/api/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

export const getMyEnti = async () => {
  const response = await api.get('/api/enti/my-enti');
  return response.data;
};

// Persone
export const getPersone = async (search = '', limit = 100) => {
  const response = await api.get('/api/anagrafica/persone', {
    params: { search, limit }
  });
  return response.data;
};

export const createPersona = async (data) => {
  const response = await api.post('/api/anagrafica/persone', data);
  return response.data;
};

// Famiglie
export const getFamiglie = async (search = '', limit = 100) => {
  const response = await api.get('/api/anagrafica/famiglie', {
    params: { search, limit }
  });
  return response.data;
};

export default api;