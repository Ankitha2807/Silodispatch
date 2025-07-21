// src/utils/api.js

const API_BASE = process.env.REACT_APP_API_URL || '';

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  return fetch(url, options);
} 