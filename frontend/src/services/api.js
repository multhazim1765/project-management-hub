import axios from 'axios';
import { API_BASE_URL } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, {
          withCredentials: true,
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens
        localStorage.removeItem('accessToken');
        
        // Dispatch a custom event instead of using window.location
        window.dispatchEvent(new Event('logout'));
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadAvatar: (formData) => api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  acceptInvitation: (data) => api.post('/auth/accept-invitation', data),
};

// Project API
export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  createFromTemplate: (data) => api.post('/projects/from-template', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  archive: (id) => api.post(`/projects/${id}/archive`),
  restore: (id) => api.post(`/projects/${id}/restore`),
  duplicate: (id, data) => api.post(`/projects/${id}/duplicate`, data),
  getMembers: (id) => api.get(`/projects/${id}/members`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
  getTemplates: () => api.get('/projects/templates'),
  getDashboard: (id) => api.get(`/projects/${id}/dashboard`),
};

// Task API
export const taskAPI = {
  getByProject: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  getMyTasks: (params) => api.get('/tasks/my-tasks', { params }),
  getOverdue: () => api.get('/tasks/overdue'),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  assign: (id, data) => api.post(`/tasks/${id}/assign`, data),
  updateStatus: (id, status) => api.put(`/tasks/${id}/status`, { status }),
  updateLabels: (id, labels) => api.put(`/tasks/${id}/labels`, { labels }),
  addDependency: (id, data) => api.post(`/tasks/${id}/dependencies`, data),
  removeDependency: (id, dependsOnTaskId) => api.delete(`/tasks/${id}/dependencies/${dependsOnTaskId}`),
  watch: (id) => api.post(`/tasks/${id}/watch`),
  unwatch: (id) => api.delete(`/tasks/${id}/watch`),
  bulkUpdate: (projectId, data) => api.put(`/projects/${projectId}/tasks/bulk`, data),
  getLabels: (projectId) => api.get(`/projects/${projectId}/labels`),
  createLabel: (projectId, data) => api.post(`/projects/${projectId}/labels`, data),
  deleteLabel: (id) => api.delete(`/labels/${id}`),
  getSubtasks: (id) => api.get(`/tasks/${id}/subtasks`),
  createSubtask: (id, data) => api.post(`/tasks/${id}/subtasks`, data),
  reorderSubtasks: (id, subtaskIds) => api.put(`/tasks/${id}/subtasks/reorder`, { subtaskIds }),
};

// Milestone API
export const milestoneAPI = {
  getByProject: (projectId) => api.get(`/projects/${projectId}/milestones`),
  getById: (id) => api.get(`/milestones/${id}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/milestones`, data),
  update: (id, data) => api.put(`/milestones/${id}`, data),
  delete: (id) => api.delete(`/milestones/${id}`),
  getTasks: (id) => api.get(`/milestones/${id}/tasks`),
  reorder: (projectId, data) => api.put(`/projects/${projectId}/milestones/reorder`, data),
};

// Time Entry API
export const timeEntryAPI = {
  getAll: (params) => api.get('/time-entries', { params }),
  getMyEntries: (params) => api.get('/time-entries/my-entries', { params }),
  getById: (id) => api.get(`/time-entries/${id}`),
  create: (data) => api.post('/time-entries', data),
  update: (id, data) => api.put(`/time-entries/${id}`, data),
  delete: (id) => api.delete(`/time-entries/${id}`),
  getWeekly: (params) => api.get('/timesheets/weekly', { params }),
  approve: (data) => api.put('/time-entries/approve', data),
  getPendingApprovals: () => api.get('/time-entries/pending-approvals'),
  getProjectReport: (projectId, params) => api.get(`/projects/${projectId}/time-report`, { params }),
  getActiveTimer: () => api.get('/timers/active'),
};

// Timer API
export const timerAPI = {
  getActive: () => api.get('/timers/active'),
  start: (data) => api.post('/timers/start', data),
  stop: (data) => api.post('/timers/stop', data),
  pause: () => api.post('/timers/pause'),
  resume: () => api.post('/timers/resume'),
};

// Issue API
export const issueAPI = {
  getByProject: (projectId, params) => api.get(`/projects/${projectId}/issues`, { params }),
  getById: (id) => api.get(`/issues/${id}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/issues`, data),
  update: (id, data) => api.put(`/issues/${id}`, data),
  delete: (id) => api.delete(`/issues/${id}`),
  assign: (id, data) => api.put(`/issues/${id}/assign`, data),
  updateStatus: (id, data) => api.put(`/issues/${id}/status`, data),
  linkTask: (id, taskId) => api.put(`/issues/${id}/link-task`, { taskId }),
  markDuplicate: (id, duplicateOfId) => api.put(`/issues/${id}/duplicate`, { duplicateOfId }),
  getStats: (projectId) => api.get(`/projects/${projectId}/issues/stats`),
  watch: (id) => api.post(`/issues/${id}/watch`),
  unwatch: (id) => api.delete(`/issues/${id}/watch`),
};

// Comment API
export const commentAPI = {
  getAll: (params) => api.get('/comments', { params }),
  create: (data) => api.post('/comments', data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
  addReaction: (id, emoji) => api.post(`/comments/${id}/reactions`, { emoji }),
  removeReaction: (id, emoji) => api.delete(`/comments/${id}/reactions/${emoji}`),
};

// Discussion API
export const discussionAPI = {
  getByProject: (projectId, params) => api.get(`/projects/${projectId}/discussions`, { params }),
  getById: (id) => api.get(`/discussions/${id}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/discussions`, data),
  update: (id, data) => api.put(`/discussions/${id}`, data),
  delete: (id) => api.delete(`/discussions/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getAdmin: () => api.get('/dashboard/admin'),
  getProjectAdmin: () => api.get('/dashboard/project-admin'),
  getProjectManager: () => api.get('/dashboard/project-manager'),
  getTeamMember: () => api.get('/dashboard/team-member'),
};

// Notification API
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getPreferences: () => api.get('/notification-preferences'),
  updatePreferences: (data) => api.put('/notification-preferences', data),
  updateTypeSetting: (type, data) => api.put(`/notification-preferences/${type}`, data),
  toggleProjectMute: (projectId) => api.post(`/notification-preferences/projects/${projectId}/toggle`),
};

// Organization API (Extended)
export const organizationAPI = {
  getMy: () => api.get('/organizations/me'),
  getById: (id) => api.get(`/organizations/${id}`),
  create: (data) => api.post('/organizations', data),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  updateSettings: (id, settings) => api.put(`/organizations/${id}/settings`, { settings }),
  uploadLogo: (id, formData) => api.post(`/organizations/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getUsers: (id, params) => api.get(`/organizations/${id}/users`, { params }),
  updateUserRole: (id, userId, role) => api.put(`/organizations/${id}/users/${userId}/role`, { role }),
  deactivateUser: (id, userId) => api.put(`/organizations/${id}/users/${userId}/deactivate`),
  reactivateUser: (id, userId) => api.put(`/organizations/${id}/users/${userId}/reactivate`),
  getStats: (id) => api.get(`/organizations/${id}/stats`),
  delete: (id) => api.delete(`/organizations/${id}`),
  invite: (id, data) => api.post(`/organizations/${id}/invite`, data),
  getInvitations: (id) => api.get(`/organizations/${id}/invitations`),
  revokeInvitation: (id) => api.delete(`/invitations/${id}`),
};

// Document API
export const documentAPI = {
  getByProject: (projectId, params) => api.get(`/projects/${projectId}/documents`, { params }),
  searchInProject: (projectId, params) => api.get(`/projects/${projectId}/documents/search`, { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (projectId, formData) => api.post(`/projects/${projectId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  uploadVersion: (id, formData) => api.post(`/documents/${id}/versions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getVersions: (id) => api.get(`/documents/${id}/versions`),
  restoreVersion: (id, versionNumber) => api.post(`/documents/${id}/versions/${versionNumber}/restore`),
  download: (id, versionNumber) => {
    const url = versionNumber
      ? `/documents/${id}/download?versionNumber=${versionNumber}`
      : `/documents/${id}/download`;
    return api.get(url, { responseType: 'blob' });
  },
  lock: (id) => api.post(`/documents/${id}/lock`),
  unlock: (id) => api.post(`/documents/${id}/unlock`),
};

// Folder API
export const folderAPI = {
  getByProject: (projectId, params) => api.get(`/projects/${projectId}/folders`, { params }),
  getTree: (projectId) => api.get(`/projects/${projectId}/folders/tree`),
  getById: (id) => api.get(`/folders/${id}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/folders`, data),
  update: (id, data) => api.put(`/folders/${id}`, data),
  move: (id, parentFolderId) => api.put(`/folders/${id}/move`, { parentFolderId }),
  delete: (id, recursive = false) => api.delete(`/folders/${id}?recursive=${recursive}`),
  getContents: (id, params) => api.get(`/folders/${id}/contents`, { params }),
  copy: (id, data) => api.post(`/folders/${id}/copy`, data),
};

// Report API
export const reportAPI = {
  getProjectProgress: (projectId) => api.get(`/reports/project-progress/${projectId}`),
  getTimeUtilization: (params) => api.get('/reports/time-utilization', { params }),
  getTaskMetrics: (projectId, params) => api.get(`/reports/task-metrics/${projectId}`, { params }),
  getBurndown: (projectId, params) => api.get(`/reports/burndown/${projectId}`, { params }),

  // PDF Exports
  exportProjectProgressPDF: (projectId) =>
    api.get(`/reports/project-progress/${projectId}/pdf`, { responseType: 'blob' }),
  exportTimeUtilizationPDF: (params) =>
    api.get('/reports/time-utilization/pdf', { params, responseType: 'blob' }),
  exportTaskMetricsPDF: (projectId, params) =>
    api.get(`/reports/task-metrics/${projectId}/pdf`, { params, responseType: 'blob' }),

  // CSV Exports
  exportProjectProgressCSV: (projectId) =>
    api.get(`/reports/project-progress/${projectId}/csv`, { responseType: 'blob' }),
  exportTimeUtilizationCSV: (params) =>
    api.get('/reports/time-utilization/csv', { params, responseType: 'blob' }),
  exportTaskMetricsCSV: (projectId, params) =>
    api.get(`/reports/task-metrics/${projectId}/csv`, { params, responseType: 'blob' }),
  exportTimeEntriesCSV: (params) =>
    api.get('/reports/time-entries/csv', { params, responseType: 'blob' }),
  exportTasksCSV: (projectId, params) =>
    api.get(`/reports/tasks/${projectId}/csv`, { params, responseType: 'blob' }),
  exportIssuesCSV: (projectId, params) =>
    api.get(`/reports/issues/${projectId}/csv`, { params, responseType: 'blob' }),
  exportProjectsCSV: (params) =>
    api.get('/reports/projects/csv', { params, responseType: 'blob' }),
};

// Phase API
export const phaseAPI = {
  getByProject: (projectId) => api.get(`/projects/${projectId}/phases`),
  getById: (id) => api.get(`/phases/${id}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/phases`, data),
  update: (id, data) => api.put(`/phases/${id}`, data),
  delete: (id) => api.delete(`/phases/${id}`),
  reorder: (projectId, phaseIds) => api.put(`/projects/${projectId}/phases/reorder`, { phaseIds }),
  getProgress: (id) => api.get(`/phases/${id}/progress`),
  duplicate: (id, data) => api.post(`/phases/${id}/duplicate`, data),
};

export default api;
