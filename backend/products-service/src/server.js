const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de métricas de Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Middleware
app.use(cors({
  origin: '*', // Permite todas las origines (para desarrollo)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Middleware para métricas
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.path, res.statusCode).observe(duration);
    httpRequestTotal.labels(req.method, req.path, res.statusCode).inc();
  });
  next();
});

// Pool de conexiones MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'inventory_user',
  password: process.env.DB_PASSWORD || 'inventory123',
  database: process.env.DB_NAME || 'inventory_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'products-service',
    timestamp: new Date().toISOString()
  });
});

// Métricas de Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// GET - Obtener todos los productos
app.get('/api/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener un producto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Crear un nuevo producto
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, sku, price, category } = req.body;

    if (!name || !sku || !price) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, SKU, and price are required' 
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO products (name, description, sku, price, category) VALUES (?, ?, ?, ?, ?)',
      [name, description, sku, parseFloat(price), category]
    );

    // Crear entrada inicial de stock
    await pool.execute(
      'INSERT INTO stock (product_id, quantity, min_stock, max_stock) VALUES (?, 0, 5, 100)',
      [result.insertId]
    );

    res.status(201).json({ 
      success: true, 
      data: { id: result.insertId, name, sku, price, category },
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'SKU already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Actualizar un producto
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, description, sku, price, category } = req.body;
    const { id } = req.params;

    const [result] = await pool.execute(
      'UPDATE products SET name = ?, description = ?, sku = ?, price = ?, category = ? WHERE id = ?',
      [name, description, sku, parseFloat(price), category, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ 
      success: true, 
      data: { id, name, sku, price, category },
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Eliminar un producto
app.delete('/api/products/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM products WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener categorías únicas
app.get('/api/products/categories/list', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category'
    );
    const categories = rows.map(row => row.category);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Products Service running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
});