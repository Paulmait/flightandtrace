const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        this.setToken(null);
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.upgradeRequired) {
          return Promise.reject({
            ...data,
            isUpgradeRequired: true,
            redirectToUpgrade: () => window.location.href = '/pricing'
          });
        }
        throw new Error(data.message || data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error.isUpgradeRequired) {
        throw error;
      }
      throw new Error(error.message || 'Network request failed');
    }
  }

  async get(endpoint, params = {}) {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        searchParams.append(key, params[key]);
      }
    });
    
    const queryString = searchParams.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url);
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();

export const authApi = {
  login: (credentials) => apiService.post('/auth/login', credentials),
  register: (userData) => apiService.post('/auth/register', userData),
  logout: () => apiService.post('/auth/logout'),
  refreshToken: () => apiService.post('/auth/refresh'),
  forgotPassword: (email) => apiService.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => apiService.post('/auth/reset-password', { token, password })
};

export const subscriptionApi = {
  getSubscription: () => apiService.get('/subscription'),
  getFeatureGate: () => apiService.get('/subscription/features'),
  getUsage: () => apiService.get('/subscription/usage'),
  
  createCheckoutSession: (data) => apiService.post('/subscription/checkout', data),
  cancelSubscription: (cancelAtPeriodEnd = true) => 
    apiService.post('/subscription/cancel', { cancelAtPeriodEnd }),
  reactivateSubscription: () => apiService.post('/subscription/reactivate'),
  
  updatePaymentMethod: () => apiService.post('/subscription/update-payment'),
  downloadInvoice: (invoiceId) => apiService.get(`/subscription/invoice/${invoiceId}`),
  
  getBillingHistory: (limit = 12) => apiService.get('/subscription/billing-history', { limit })
};

export const flightApi = {
  getFlights: (params = {}) => {
    return apiService.get('/flights', params).catch(error => {
      if (error.isUpgradeRequired) {
        return {
          flights: [],
          upgradeRequired: true,
          message: error.reason
        };
      }
      throw error;
    });
  },
  
  getFlight: (id) => apiService.get(`/flights/${id}`),
  
  getFlightHistory: (id, days = 7) => {
    return apiService.get(`/flights/${id}/history`, { days }).catch(error => {
      if (error.isUpgradeRequired) {
        return {
          history: [],
          upgradeRequired: true,
          message: error.reason,
          maxDays: error.maxHistoryDays || 7
        };
      }
      throw error;
    });
  },

  searchFlights: (query, filters = {}) => 
    apiService.get('/flights/search', { q: query, ...filters }),

  exportFlights: (format, params = {}) => {
    return apiService.get(`/flights/export/${format}`, params).catch(error => {
      if (error.isUpgradeRequired) {
        return {
          error: true,
          upgradeRequired: true,
          message: error.reason,
          suggestedTier: error.suggestedTier
        };
      }
      throw error;
    });
  }
};

export const alertApi = {
  getAlerts: () => apiService.get('/alerts'),
  
  createAlert: (alertData) => {
    return apiService.post('/alerts', alertData).catch(error => {
      if (error.isUpgradeRequired) {
        return {
          error: true,
          upgradeRequired: true,
          message: error.reason,
          limit: error.limit,
          remaining: error.remaining
        };
      }
      throw error;
    });
  },
  
  updateAlert: (id, alertData) => apiService.put(`/alerts/${id}`, alertData),
  deleteAlert: (id) => apiService.delete(`/alerts/${id}`),
  toggleAlert: (id) => apiService.post(`/alerts/${id}/toggle`)
};

export const weatherApi = {
  getWeatherOverlay: (bounds) => {
    return apiService.get('/weather/overlay', bounds).catch(error => {
      if (error.isUpgradeRequired) {
        return {
          overlay: null,
          upgradeRequired: true,
          message: error.reason,
          suggestedTier: 'premium'
        };
      }
      throw error;
    });
  },
  
  getAirportWeather: (icao) => apiService.get(`/weather/airport/${icao}`)
};

export const analyticsApi = {
  track: (event, properties = {}) => {
    if (!window.gtag && !window.mixpanel) return;
    
    try {
      if (window.gtag) {
        window.gtag('event', event, properties);
      }
      
      if (window.mixpanel) {
        window.mixpanel.track(event, properties);
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  },
  
  trackUpgrade: (fromTier, toTier, source = 'app') => {
    analyticsApi.track('subscription_upgrade', {
      from_tier: fromTier,
      to_tier: toTier,
      source,
      timestamp: new Date().toISOString()
    });
  },
  
  trackFeatureBlocked: (feature, tier, source = 'app') => {
    analyticsApi.track('feature_blocked', {
      feature,
      user_tier: tier,
      source,
      timestamp: new Date().toISOString()
    });
  }
};

export default apiService;