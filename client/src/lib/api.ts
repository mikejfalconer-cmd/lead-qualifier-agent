import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('webhookToken');
  if (token) {
    config.headers['X-Webhook-Token'] = token;
  }
  return config;
});

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('webhookToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Lead {
  id: number;
  clientId: number;
  senderEmail: string;
  senderName?: string;
  subject: string;
  message: string;
  qualification: 'hot' | 'warm' | 'cold';
  status: 'new' | 'contacted' | 'converted' | 'lost';
  messageId?: string;
}

export interface FollowUp {
  id: number;
  leadId: number;
  clientId: number;
  emailBody: string;
  sentAt: string;
  responseReceived: boolean;
  responseBody?: string;
  responseReceivedAt?: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  webhookToken: string;
  subscriptionStatus: 'active' | 'paused' | 'cancelled';
}

// Lead endpoints
export const leadsAPI = {
  getByClient: (clientId: number) =>
    api.get<Lead[]>(`/leads/client/${clientId}`),
  
  getById: (leadId: number) =>
    api.get<Lead>(`/leads/${leadId}`),
  
  getStats: (clientId: number) =>
    api.get<{
      total: number;
      hot: number;
      warm: number;
      cold: number;
      contacted: number;
      converted: number;
    }>(`/leads/stats/${clientId}`),
};

// Follow-up endpoints
export const followUpsAPI = {
  getByLead: (leadId: number) =>
    api.get<FollowUp[]>(`/follow-ups/lead/${leadId}`),
  
  getByClient: (clientId: number) =>
    api.get<FollowUp[]>(`/follow-ups/client/${clientId}`),
};

// Client endpoints
export const clientsAPI = {
  getMe: (token: string) =>
    api.get<Client>(`/clients/me`, {
      headers: { 'X-Webhook-Token': token },
    }),
};
