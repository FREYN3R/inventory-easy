import { useState, useEffect } from 'react';
import api from '../services/api';

function Stock() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState('IN');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movementData, setMovementData] = useState({
    quantity: '',
    reason: ''
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const response = await api.stock.getAll();
      setInventory(response.data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMovement = async (e) => {
    e.preventDefault();
    try {
      if (movementType === 'IN') {
        await api.stock.registerEntry({
          product_id: selectedProduct.product_id,
          quantity: parseInt(movementData.quantity),
          reason: movementData.reason
        });
      } else {
        await api.stock.registerExit({
          product_id: selectedProduct.product_id,
          quantity: parseInt(movementData.quantity),
          reason: movementData.reason
        });
      }
      setShowMovementModal(false);
      setMovementData({ quantity: '', reason: '' });
      setSelectedProduct(null);
      loadInventory();
    } catch (error) {
      alert('Error al registrar movimiento: ' + error.message);
    }
  };

  const openMovementModal = (product, type) => {
    setSelectedProduct(product);
    setMovementType(type);
    setShowMovementModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'LOW': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'LOW': return '⚠️ Bajo';
      case 'HIGH': return '📦 Alto';
      default: return '✓ Normal';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Control de Inventario</h2>
            <p className="text-gray-600 mt-1">Total de productos: {inventory.length}</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-green-600">
                ${(inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0) / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
        </div>
      ) : inventory.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">No hay productos en el inventario</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rango
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-2xl font-bold text-gray-900">{item.quantity}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm text-gray-600">
                        {item.min_stock} - {item.max_stock}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="font-medium text-gray-900">
                        ${(item.price * item.quantity).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openMovementModal(item, 'IN')}
                          className="bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          📥 Entrada
                        </button>
                        <button
                          onClick={() => openMovementModal(item, 'OUT')}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          📤 Salida
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {movementType === 'IN' ? '📥 Entrada de Stock' : '📤 Salida de Stock'}
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="font-medium text-gray-800">{selectedProduct?.product_name}</p>
              <p className="text-sm text-gray-600">Stock actual: {selectedProduct?.quantity} unidades</p>
            </div>
            <form onSubmit={handleMovement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={movementData.quantity}
                  onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ingrese la cantidad"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo
                </label>
                <textarea
                  value={movementData.reason}
                  onChange={(e) => setMovementData({ ...movementData, reason: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Opcional: Descripción del movimiento"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMovementModal(false);
                    setMovementData({ quantity: '', reason: '' });
                    setSelectedProduct(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 ${
                    movementType === 'IN'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white py-3 rounded-lg font-medium transition-colors`}
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Stock;