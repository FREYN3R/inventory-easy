const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3003;

// Configuración de métricas de Prometheus
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
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
    service: 'suppliers-service',
    timestamp: new Date().toISOString()
  });
});

// Métricas de Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// GET - Obtener todos los proveedores
app.get('/api/suppliers', async (req, res) => {
  try {
    const { status, city, search } = req.query;
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (city) {
      query += ' AND city = ?';
      params.push(city);
    }

    if (search) {
      query += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener un proveedor por ID
app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM suppliers WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Crear un nuevo proveedor
app.post('/api/suppliers', async (req, res) => {
  try {
    const { name, contact_person, email, phone, address, city, country, status } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Supplier name is required' 
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO suppliers (name, contact_person, email, phone, address, city, country, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, contact_person, email, phone, address, city, country || 'Colombia', status || 'ACTIVE']
    );

    res.status(201).json({ 
      success: true, 
      data: { id: result.insertId, name, contact_person, email, status: status || 'ACTIVE' },
      message: 'Supplier created successfully'
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Actualizar un proveedor
app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { name, contact_person, email, phone, address, city, country, status } = req.body;
    const { id } = req.params;

    const [result] = await pool.execute(
      `UPDATE suppliers 
       SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?, city = ?, country = ?, status = ?
       WHERE id = ?`,
      [name, contact_person, email, phone, address, city, country, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({ 
      success: true, 
      data: { id, name, contact_person, email, status },
      message: 'Supplier updated successfully'
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Eliminar un proveedor
app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM suppliers WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({ 
      success: true, 
      message: 'Supplier deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener productos de un proveedor
app.get('/api/suppliers/:id/products', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        p.*,
        ps.cost_price,
        ps.is_primary
      FROM product_suppliers ps
      INNER JOIN products p ON ps.product_id = p.id
      WHERE ps.supplier_id = ?
      ORDER BY p.name
    `, [req.params.id]);

    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Asociar producto con proveedor
app.post('/api/suppliers/:supplierId/products', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { product_id, cost_price, is_primary } = req.body;

    if (!product_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Product ID is required' 
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO product_suppliers (product_id, supplier_id, cost_price, is_primary) 
       VALUES (?, ?, ?, ?)`,
      [product_id, supplierId, cost_price, is_primary || false]
    );

    res.status(201).json({ 
      success: true, 
      data: { id: result.insertId, product_id, supplier_id: supplierId, cost_price },
      message: 'Product associated with supplier successfully'
    });
  } catch (error) {
    console.error('Error associating product:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        success: false, 
        error: 'Product already associated with this supplier' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Desasociar producto de proveedor
app.delete('/api/suppliers/:supplierId/products/:productId', async (req, res) => {
  try {
    const { supplierId, productId } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM product_suppliers WHERE supplier_id = ? AND product_id = ?',
      [supplierId, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Association not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Product disassociated from supplier successfully' 
    });
  } catch (error) {
    console.error('Error disassociating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Obtener ciudades únicas
app.get('/api/suppliers/cities/list', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT city FROM suppliers WHERE city IS NOT NULL ORDER BY city'
    );
    const cities = rows.map(row => row.city);
    res.json({ success: true, data: cities });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Suppliers Service running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
});