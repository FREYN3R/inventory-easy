const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3002;

// Configuración de métricas de Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const stockLevelGauge = new promClient.Gauge({
  name: 'stock_level',
  help: 'Current stock level by product',
  labelNames: ['product_id', 'product_name'],
  registers: [register]
});

// Middleware
app.use(cors({
  origin: '*', // Permite todas las origines (para desarrollo)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.path, res.statusCode).observe(duration);
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
    service: 'stock-service',
    timestamp: new Date().toISOString()
  });
});

// Métricas de Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// GET - Obtener todo el inventario con información de productos
app.get('/api/stock', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        s.*,
        p.name as product_name,
        p.sku,
        p.price,
        CASE 
          WHEN s.quantity <= s.min_stock THEN 'LOW'
          WHEN s.quantity >= s.max_stock THEN 'HIGH'
          ELSE 'NORMAL'
        END as status
      FROM stock s
      INNER JOIN products p ON s.product_id = p.id
      ORDER BY p.name
    `);

    // Actualizar métricas de Prometheus
    rows.forEach(row => {
      stockLevelGauge.labels(row.product_id.toString(), row.product_name).set(row.quantity);
    });

    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener stock de un producto específico
app.get('/api/stock/product/:productId', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        s.*,
        p.name as product_name,
        p.sku,
        CASE 
          WHEN s.quantity <= s.min_stock THEN 'LOW'
          WHEN s.quantity >= s.max_stock THEN 'HIGH'
          ELSE 'NORMAL'
        END as status
      FROM stock s
      INNER JOIN products p ON s.product_id = p.id
      WHERE s.product_id = ?
    `, [req.params.productId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Registrar entrada de stock
app.post('/api/stock/in', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { product_id, quantity, reason } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid product_id and positive quantity are required' 
      });
    }

    // Obtener stock actual
    const [stockRows] = await connection.execute(
      'SELECT quantity FROM stock WHERE product_id = ?',
      [product_id]
    );

    if (stockRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const previousQty = stockRows[0].quantity;
    const newQty = previousQty + parseInt(quantity);

    // Actualizar stock
    await connection.execute(
      'UPDATE stock SET quantity = ? WHERE product_id = ?',
      [newQty, product_id]
    );

    // Registrar movimiento
    await connection.execute(
      'INSERT INTO stock_movements (product_id, movement_type, quantity, reason, previous_quantity, new_quantity) VALUES (?, ?, ?, ?, ?, ?)',
      [product_id, 'IN', quantity, reason || 'Stock entry', previousQty, newQty]
    );

    await connection.commit();

    res.json({ 
      success: true, 
      data: { product_id, previous_quantity: previousQty, new_quantity: newQty },
      message: 'Stock entry registered successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error registering stock entry:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

// POST - Registrar salida de stock
app.post('/api/stock/out', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { product_id, quantity, reason } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid product_id and positive quantity are required' 
      });
    }

    // Obtener stock actual
    const [stockRows] = await connection.execute(
      'SELECT quantity FROM stock WHERE product_id = ?',
      [product_id]
    );

    if (stockRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const previousQty = stockRows[0].quantity;
    const newQty = previousQty - parseInt(quantity);

    if (newQty < 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient stock',
        available: previousQty,
        requested: quantity
      });
    }

    // Actualizar stock
    await connection.execute(
      'UPDATE stock SET quantity = ? WHERE product_id = ?',
      [newQty, product_id]
    );

    // Registrar movimiento
    await connection.execute(
      'INSERT INTO stock_movements (product_id, movement_type, quantity, reason, previous_quantity, new_quantity) VALUES (?, ?, ?, ?, ?, ?)',
      [product_id, 'OUT', quantity, reason || 'Stock exit', previousQty, newQty]
    );

    await connection.commit();

    res.json({ 
      success: true, 
      data: { product_id, previous_quantity: previousQty, new_quantity: newQty },
      message: 'Stock exit registered successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error registering stock exit:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

// GET - Obtener historial de movimientos
app.get('/api/stock/movements/:productId?', async (req, res) => {
  try {
    let query = `
      SELECT 
        sm.*,
        p.name as product_name,
        p.sku
      FROM stock_movements sm
      INNER JOIN products p ON sm.product_id = p.id
    `;
    const params = [];

    if (req.params.productId) {
      query += ' WHERE sm.product_id = ?';
      params.push(req.params.productId);
    }

    query += ' ORDER BY sm.created_at DESC LIMIT 100';

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('Error fetching movements:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Productos con stock bajo
app.get('/api/stock/alerts/low', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        s.*,
        p.name as product_name,
        p.sku,
        p.price
      FROM stock s
      INNER JOIN products p ON s.product_id = p.id
      WHERE s.quantity <= s.min_stock
      ORDER BY s.quantity ASC
    `);

    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Stock Service running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
});