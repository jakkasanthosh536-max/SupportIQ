import {
  User, KnowledgeArticle, UploadedDocument, Conversation,
  ChatMessage, SupportTicket, KnowledgeGap, SearchResultItem,
  AnalyticsOverview, SettingsData, Category, Tag
} from '../types';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL as string) || '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('supportiq_token');
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('supportiq_token', token);
  } else {
    localStorage.removeItem('supportiq_token');
  }
}

// In-flight deduplication and fast in-memory cache for GET requests
interface CacheEntry {
  data: any;
  expiry: number;
}
const getCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();
const GET_CACHE_TTL_MS = 4000; // 4 seconds short-term cache for rapid re-renders and sibling components

export function clearApiCache() {
  getCache.clear();
}

async function executeFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  const targetUrl = `${API_BASE_URL}${endpoint}`;

  try {
    response = await fetch(targetUrl, {
      ...options,
      headers,
    });

    // If local proxy returned a 500/502/504 error, attempt direct fallback to backend port 8000
    if (
      response.status >= 500 &&
      API_BASE_URL === '/api' &&
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      try {
        const directResp = await fetch(`http://127.0.0.1:8000/api${endpoint}`, {
          ...options,
          headers,
        });
        if (directResp.ok || directResp.status < 500) {
          response = directResp;
        }
      } catch {
        // retain original response if direct call fails
      }
    }
  } catch (netErr) {
    if (
      API_BASE_URL === '/api' &&
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      response = await fetch(`http://127.0.0.1:8000/api${endpoint}`, {
        ...options,
        headers,
      });
    } else {
      throw netErr;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Clear invalid/expired token
      setStoredToken(null);
    }
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const token = getStoredToken();
  const cacheKey = `${token || 'anon'}:${endpoint}`;

  if (!isGet) {
    // Mutations immediately invalidate GET cache
    getCache.clear();
    return executeFetch<T>(endpoint, options);
  }

  // Check valid cached entry
  const cached = getCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }

  // Check in-flight promise to eliminate duplicate concurrent calls
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)! as Promise<T>;
  }

  const fetchPromise = executeFetch<T>(endpoint, options)
    .then((data) => {
      getCache.set(cacheKey, { data, expiry: Date.now() + GET_CACHE_TTL_MS });
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.access_token);
    return res;
  },

  async register(email: string, password: string, full_name: string, role: string = 'customer') {
    const res = await request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, role }),
    });
    setStoredToken(res.access_token);
    return res;
  },

  async demoLogin(role: 'admin' | 'agent' | 'customer') {
    const res = await request<{ access_token: string; user: User }>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    setStoredToken(res.access_token);
    return res;
  },

  async getMe() {
    return request<User>('/auth/me');
  },

  logout() {
    setStoredToken(null);
  },

  // Knowledge Articles
  async getArticles(params: { category_id?: number; status?: string; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.category_id) query.append('category_id', params.category_id.toString());
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<KnowledgeArticle[]>(`/knowledge${qs}`);
  },

  async getArticle(idOrSlug: string | number) {
    return request<KnowledgeArticle>(`/knowledge/${idOrSlug}`);
  },

  async createArticle(data: Partial<KnowledgeArticle>) {
    return request<KnowledgeArticle>('/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateArticle(id: number, data: Partial<KnowledgeArticle>) {
    return request<KnowledgeArticle>(`/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteArticle(id: number) {
    return request<void>(`/knowledge/${id}`, {
      method: 'DELETE',
    });
  },

  async getCategories() {
    return request<Category[]>('/knowledge/categories');
  },

  async createCategory(data: { name: string; description?: string; icon?: string }) {
    return request<Category>('/knowledge/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTags() {
    return request<Tag[]>('/knowledge/tags');
  },

  // Documents
  async uploadDocument(formData: FormData) {
    return request<UploadedDocument>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async getDocuments() {
    return request<UploadedDocument[]>('/documents');
  },

  async getDocument(id: number) {
    return request<UploadedDocument>(`/documents/${id}`);
  },

  async reindexDocument(id: number) {
    return request<UploadedDocument>(`/documents/${id}/reindex`, {
      method: 'POST',
    });
  },

  async deleteDocument(id: number) {
    return request<void>(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  // Search
  async searchKnowledge(q: string, category_id?: number) {
    const query = new URLSearchParams({ q });
    if (category_id) query.append('category_id', category_id.toString());
    return request<{ query: string; total_results: number; results: SearchResultItem[] }>(`/search?${query.toString()}`);
  },

  // Chat
  async sendChatMessage(content: string, conversation_id?: number) {
    return request<ChatMessage>('/chat', {
      method: 'POST',
      body: JSON.stringify({ content, conversation_id }),
    });
  },

  async getConversations() {
    return request<Conversation[]>('/chat/conversations');
  },

  async getConversation(id: number) {
    return request<Conversation>(`/chat/conversations/${id}`);
  },

  async submitFeedback(message_id: number, rating: number, comment?: string) {
    return request<{ status: string }>('/chat/feedback', {
      method: 'POST',
      body: JSON.stringify({ message_id, rating, comment }),
    });
  },

  // Support Tickets
  async getTickets(params: { status?: string; priority?: string; assigned_to_me?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.priority) query.append('priority', params.priority);
    if (params.assigned_to_me) query.append('assigned_to_me', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<SupportTicket[]>(`/tickets${qs}`);
  },

  async createTicket(data: { subject: string; issue_description: string; priority?: string; conversation_id?: number; escalation_reason?: string }) {
    return request<SupportTicket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTicket(id: number) {
    return request<SupportTicket>(`/tickets/${id}`);
  },

  async updateTicket(id: number, data: Partial<SupportTicket>) {
    return request<SupportTicket>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async addTicketNote(id: number, note: string, is_internal: boolean = true) {
    return request<any>(`/tickets/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note, is_internal }),
    });
  },

  // Knowledge Gaps
  async getKnowledgeGaps(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return request<KnowledgeGap[]>(`/knowledge-gaps${qs}`);
  },

  async updateKnowledgeGap(id: number, data: { status?: string; suggested_action?: string }) {
    return request<KnowledgeGap>(`/knowledge-gaps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async createArticleFromGap(id: number, data: { title: string; content: string; category_id?: number; tags?: string[] }) {
    return request<KnowledgeArticle>(`/knowledge-gaps/${id}/create-article`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Analytics
  async getAnalyticsOverview() {
    return request<AnalyticsOverview>('/analytics/overview');
  },

  async downloadTicketsCsv() {
    const token = getStoredToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/analytics/export-csv`, { headers });
      if (
        !res.ok &&
        res.status >= 500 &&
        API_BASE_URL === '/api' &&
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ) {
        res = await fetch('http://127.0.0.1:8000/api/analytics/export-csv', { headers });
      }
    } catch {
      res = await fetch('http://127.0.0.1:8000/api/analytics/export-csv', { headers });
    }
    if (!res.ok) throw new Error('Failed to download CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supportiq_tickets_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // Settings
  async getSystemStatus() {
    return request<{ is_live_llm: boolean; ai_provider: string; ai_model: string; mode_label: string }>('/settings/status');
  },

  async getSettings() {
    return request<SettingsData>('/settings');
  },

  async updateSettings(data: Partial<SettingsData> & { gemini_api_key?: string; groq_api_key?: string; openai_api_key?: string }) {
    return request<SettingsData>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async resetDemoData() {
    return request<{ status: string; message: string }>('/settings/reset-demo-data', {
      method: 'POST',
    });
  },

  async checkHealth() {
    return request<{ status: string; app: string; version: string; ai_provider: string; mode: string }>('/health');
  }
};
