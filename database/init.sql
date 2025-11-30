-- Script de inicialización de la base de datos InventoryEasy

CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_sku (sku)
);

-- Tabla de Stock
CREATE TABLE IF NOT EXISTS stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_stock INT DEFAULT 5,
    max_stock INT DEFAULT 100,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id)
);

-- Tabla de Movimientos de Stock (para auditoría)
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM('IN', 'OUT') NOT NULL,
    quantity INT NOT NULL,
    reason VARCHAR(255),
    previous_quantity INT,
    new_quantity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_movements (product_id),
    INDEX idx_created_at (created_at)
);

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Colombia',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_status (status)
);

-- Tabla de relación Productos-Proveedores
CREATE TABLE IF NOT EXISTS product_suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    cost_price DECIMAL(10, 2),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_supplier (product_id, supplier_id),
    INDEX idx_product (product_id),
    INDEX idx_supplier (supplier_id)
);

-- Datos de ejemplo
INSERT INTO products (name, description, sku, price, category) VALUES
('Laptop Dell Inspiron', 'Laptop para oficina, 8GB RAM, 256GB SSD', 'LAP-DELL-001', 2500000, 'Electrónica'),
('Mouse Inalámbrico', 'Mouse ergonómico inalámbrico', 'MOU-WIRE-001', 45000, 'Accesorios'),
('Teclado Mecánico', 'Teclado mecánico RGB', 'KEY-MECH-001', 180000, 'Accesorios'),
('Monitor 24 pulgadas', 'Monitor Full HD 24"', 'MON-24IN-001', 650000, 'Electrónica'),
('Audífonos Bluetooth', 'Audífonos inalámbricos con cancelación de ruido', 'AUD-BT-001', 150000, 'Audio');

INSERT INTO stock (product_id, quantity, min_stock, max_stock) VALUES
(1, 15, 5, 50),
(2, 45, 10, 100),
(3, 30, 10, 80),
(4, 20, 5, 40),
(5, 25, 8, 60);

INSERT INTO suppliers (name, contact_person, email, phone, address, city) VALUES
('TechStore Colombia', 'Carlos Mendoza', 'ventas@techstore.co', '3001234567', 'Calle 100 #15-20', 'Bogotá'),
('Importaciones Global', 'María González', 'compras@impglobal.com', '3109876543', 'Carrera 50 #45-30', 'Medellín'),
('Distribuidora Nacional', 'Juan Pérez', 'info@distnacional.co', '3157654321', 'Avenida 5 #12-45', 'Cali');

INSERT INTO product_suppliers (product_id, supplier_id, cost_price, is_primary) VALUES
(1, 1, 2200000, TRUE),
(2, 2, 35000, TRUE),
(3, 2, 150000, TRUE),
(4, 1, 550000, TRUE),
(5, 3, 120000, TRUE);

-- Vista para reportes de inventario
CREATE OR REPLACE VIEW inventory_report AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.price,
    p.category,
    s.quantity,
    s.min_stock,
    s.max_stock,
    CASE 
        WHEN s.quantity <= s.min_stock THEN 'BAJO'
        WHEN s.quantity >= s.max_stock THEN 'ALTO'
        ELSE 'NORMAL'
    END as stock_status,
    (p.price * s.quantity) as inventory_value
FROM products p
LEFT JOIN stock s ON p.id = s.product_id;

-- Vista para proveedores activos con sus productos
CREATE OR REPLACE VIEW active_suppliers_products AS
SELECT 
    s.id as supplier_id,
    s.name as supplier_name,
    s.email,
    s.phone,
    p.id as product_id,
    p.name as product_name,
    ps.cost_price,
    ps.is_primary
FROM suppliers s
LEFT JOIN product_suppliers ps ON s.id = ps.supplier_id
LEFT JOIN products p ON ps.product_id = p.id
WHERE s.status = 'ACTIVE';