import { useState, useEffect } from 'react';
import api from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockItems: 0,
    totalSuppliers: 0,
    inventoryValue: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [productsRes, stockRes, suppliersRes, lowStockRes, movementsRes] = await Promise.all([
        api.products.getAll(),
        api.stock.getAll(),
        api.suppliers.getAll(),
        api.stock.getLowStockAlerts(),
        api.stock.getMovements()
      ]);

      const totalValue = stockRes.data.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      const totalStockQty = stockRes.data.reduce((sum, item) => 
        sum + item.quantity, 0
      );

      setStats({
        totalProducts: productsRes.count,
        totalStock: totalStockQty,
        lowStockItems: lowStockRes.count,
        totalSuppliers: suppliersRes.count,
        inventoryValue: totalValue
      });

      setLowStockProducts(lowStockRes.data.slice(0, 5));
      setRecentMovements(movementsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon="📦"
          title="Total Productos"
          value={stats.totalProducts}
          color="blue"
        />
        <StatCard
          icon="📊"
          title="Stock Total"
          value={stats.totalStock}
          subtitle="unidades"
          color="green"
        />
        <StatCard
          icon="⚠️"
          title="Stock Bajo"
          value={stats.lowStockItems}
          subtitle="productos"
          color="red"
        />
        <StatCard
          icon="🏢"
          title="Proveedores"
          value={stats.totalSuppliers}
          color="purple"
        />
        <StatCard
          icon="💰"
          title="Valor Inventario"
          value={`$${(stats.inventoryValue / 1000).toFixed(0)}K`}
          color="yellow"
        />
      </div>

      {/* Alerts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="text-2xl mr-2">⚠️</span>
            Alertas de Stock Bajo
          </h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              ✓ Todos los productos tienen stock suficiente
            </p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{product.product_name}</p>
                    <p className="text-sm text-gray-600">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{product.quantity}</p>
                    <p className="text-xs text-gray-500">Min: {product.min_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="text-2xl mr-2">📋</span>
            Movimientos Recientes
          </h2>
          {recentMovements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay movimientos registrados</p>
          ) : (
            <div className="space-y-3">
              {recentMovements.map(movement => (
                <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className={`text-2xl ${movement.movement_type === 'IN' ? '📥' : '📤'}`}>
                      {movement.movement_type === 'IN' ? '📥' : '📤'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{movement.product_name}</p>
                      <p className="text-xs text-gray-500">{movement.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movement.movement_type === 'IN' ? '+' : '-'}{movement.quantity}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(movement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function QuickActionButton({ icon, text }) {
  return (
    <button className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors border-2 border-transparent hover:border-indigo-300">
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{text}</span>
    </button>
  );
}

export default Dashboard;