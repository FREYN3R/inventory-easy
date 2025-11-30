import { useState } from 'react';
import Products from './components/Products';
import Stock from './components/Stock';
import Suppliers from './components/Suppliers';
import Dashboard from './components/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'products', name: 'Productos', icon: '📦' },
    { id: 'stock', name: 'Inventario', icon: '📋' },
    { id: 'suppliers', name: 'Proveedores', icon: '🏢' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-3 rounded-lg">
                <span className="text-3xl">📦</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">InventoryEasy</h1>
                <p className="text-sm text-gray-600">Sistema de Gestión de Inventario</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ✓ Sistema Activo
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-b-4 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'products' && <Products />}
        {activeTab === 'stock' && <Stock />}
        {activeTab === 'suppliers' && <Suppliers />}
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-inner mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          <p className="font-medium">InventoryEasy - Proyecto Formativo UNAD</p>
          <p className="text-sm mt-1">Desarrollado por: Freyner Alexander Nazareno Cortes y Nelsy Daniela</p>
          <p className="text-xs mt-2 text-gray-500">
            Arquitectura de Sistemas Computacionales con Enfoque Cloud
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;