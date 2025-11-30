const PRODUCTS_API = import.meta.env.VITE_PRODUCTS_API || 'http://localhost:3001';
const STOCK_API = import.meta.env.VITE_STOCK_API || 'http://localhost:3002';
const SUPPLIERS_API = import.meta.env.VITE_SUPPLIERS_API || 'http://localhost:3003';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error en la petición');
  }
  return data;
};

const api = {
  products: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`${PRODUCTS_API}/api/products?${query}`);
      return handleResponse(response);
    },
    
    getById: async (id) => {
      const response = await fetch(`${PRODUCTS_API}/api/products/${id}`);
      return handleResponse(response);
    },
    
    create: async (data) => {
      const response = await fetch(`${PRODUCTS_API}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },
    
    update: async (id, data) => {
      const response = await fetch(`${PRODUCTS_API}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },
    
    delete: async (id) => {
      const response = await fetch(`${PRODUCTS_API}/api/products/${id}`, {
        method: 'DELETE'
      });
      return handleResponse(response);
    },
    
    getCategories: async () => {
      const response = await fetch(`${PRODUCTS_API}/api/products/categories/list`);
      return handleResponse(response);
    }
  },

  stock: {
    getAll: async () => {
      const response = await fetch(`${STOCK_API}/api/stock`);
      return handleResponse(response);
    },
    
    getByProduct: async (productId) => {
      const response = await fetch(`${STOCK_API}/api/stock/product/${productId}`);
      return handleResponse(response);
    },
    
    registerEntry: async (data) => {
      const response = await fetch(`${STOCK_API}/api/stock/in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },
    
    registerExit: async (data) => {
      const response = await fetch(`${STOCK_API}/api/stock/out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },
    
    getMovements: async (productId = null) => {
      const url = productId 
        ? `${STOCK_API}/api/stock/movements/${productId}`
        : `${STOCK_API}/api/stock/movements`;
      const response = await fetch(url);
      return handleResponse(response);
    },
    
    getLowStockAlerts: async () => {
      const response = await fetch(`${STOCK_API}/api/stock/alerts/low`);
      return handleResponse(response);
    }
  },

  suppliers: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`${SUPPLIERS_API}/api/suppliers?${query}`);
      return handleResponse(response);
    },
    
    getById: async (id) => {
      const response = await fetch(`${SUPPLIERS_API}/api/suppliers/${id}`);
      return handleResponse(response);
    },
    
    create: async (data) => {
      const response = await fetch(`${SUPPLIERS_API}/api/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },
    
    update: async (id, data) => {
      const response = await fetch(`${SUPPLIERS_API}/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },
    
    delete: async (id) => {
      const response = await fetch(`${SUPPLIERS_API}/api/suppliers/${id}`, {
        method: 'DELETE'
      });
      return handleResponse(response);
    },
    
    getProducts: async (supplierId) => {
      const response = await fetch(`${SUPPLIERS_API}/api/suppliers/${supplierId}/products`);
      return handleResponse(response);
    },
    
    associateProduct: async (supplierId, data) => {
      const response = await fetch(`${SUPPLIERS_API}/api/suppliers/${supplierId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    }
  }
};

export default api;