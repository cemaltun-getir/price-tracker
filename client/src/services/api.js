import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
});

// Category API calls
export const categoryAPI = {
  getAll: () => api.get('/api/categories'),
  create: (data) => api.post('/api/categories', data),
  update: (id, data) => api.put(`/api/categories/${id}`, data),
  delete: (id) => api.delete(`/api/categories/${id}`)
};

// Sub-Category API calls
export const subCategoryAPI = {
  getAll: (categoryId = null) => {
    const params = categoryId ? { category_id: categoryId } : {};
    return api.get('/api/sub-categories', { params });
  },
  create: (data) => api.post('/api/sub-categories', data),
  update: (id, data) => api.put(`/api/sub-categories/${id}`, data),
  delete: (id) => api.delete(`/api/sub-categories/${id}`)
};

// SKU API calls
export const skuAPI = {
  getAll: () => api.get('/api/skus'),
  create: (formData) => api.post('/api/skus', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/api/skus/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/api/skus/${id}`)
};

// Vendor API calls
export const vendorAPI = {
  getAll: () => api.get('/api/vendors'),
  create: (formData) => api.post('/api/vendors', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/api/vendors/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/api/vendors/${id}`)
};

// Location API calls
export const locationAPI = {
  getAll: () => api.get('/api/locations'),
  create: (data) => api.post('/api/locations', data),
  update: (id, data) => api.put(`/api/locations/${id}`, data),
  delete: (id) => api.delete(`/api/locations/${id}`)
};

// Simple Location API calls (for Price Mappings)
export const simpleLocationAPI = {
  getAll: () => api.get('/api/simple-locations'),
  create: (data) => api.post('/api/simple-locations', data),
  update: (id, data) => api.put(`/api/simple-locations/${id}`, data),
  delete: (id) => api.delete(`/api/simple-locations/${id}`)
};

// Price Mapping API calls
export const priceMappingAPI = {
  getAll: () => api.get('/api/price-mappings'),
  create: (data) => api.post('/api/price-mappings', data),
  delete: (id) => api.delete(`/api/price-mappings/${id}`),
  uploadExcel: (formData) => api.post('/api/upload-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export default api; 