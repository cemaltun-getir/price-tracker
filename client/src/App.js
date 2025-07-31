import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import SKUManager from './components/SKUManager';
import CategoryManager from './components/CategoryManager';
import VendorManager from './components/VendorManager';
import LocationManager from './components/LocationManager';
import SimpleLocationManager from './components/SimpleLocationManager';
import PriceMappingManager from './components/PriceMappingManager';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="shadow-lg" style={{ backgroundColor: '#5d3ebc' }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-12">
              <div className="flex items-center">
                <div className="text-xl font-bold text-white">Price Tracker</div>
              </div>
              <div className="flex items-center space-x-8">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    isActive
                      ? "text-white border-b-2 border-white px-3 py-1 text-sm font-medium"
                      : "text-gray-200 hover:text-white px-3 py-1 text-sm font-medium"
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/skus"
                  className={({ isActive }) =>
                    isActive
                      ? "text-white border-b-2 border-white px-3 py-1 text-sm font-medium"
                      : "text-gray-200 hover:text-white px-3 py-1 text-sm font-medium"
                  }
                >
                  SKUs
                </NavLink>
                <NavLink
                  to="/categories"
                  className={({ isActive }) =>
                    isActive
                      ? "text-white border-b-2 border-white px-3 py-1 text-sm font-medium"
                      : "text-gray-200 hover:text-white px-3 py-1 text-sm font-medium"
                  }
                >
                  Categories
                </NavLink>
                <NavLink
                  to="/vendors"
                  className={({ isActive }) =>
                    isActive
                      ? "text-white border-b-2 border-white px-3 py-1 text-sm font-medium"
                      : "text-gray-200 hover:text-white px-3 py-1 text-sm font-medium"
                  }
                >
                  Vendors
                </NavLink>
                <NavLink
                  to="/locations"
                  className={({ isActive }) =>
                    isActive
                      ? "text-white border-b-2 border-white px-3 py-1 text-sm font-medium"
                      : "text-gray-200 hover:text-white px-3 py-1 text-sm font-medium"
                  }
                >
                  Locations
                </NavLink>
                <NavLink
                  to="/price-locations"
                  className={({ isActive }) =>
                    isActive
                      ? "text-white border-b-2 border-white px-3 py-1 text-sm font-medium"
                      : "text-gray-200 hover:text-white px-3 py-1 text-sm font-medium"
                  }
                >
                  Price Locations
                </NavLink>
                <NavLink
                  to="/price-mappings"
                  className={({ isActive }) =>
                    isActive
                      ? "text-white border-b-2 border-white px-3 py-1 text-sm font-medium"
                      : "text-gray-200 hover:text-white px-3 py-1 text-sm font-medium"
                  }
                >
                  Price Mappings
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 px-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/skus" element={<SKUManager />} />
            <Route path="/categories" element={<CategoryManager />} />
            <Route path="/vendors" element={<VendorManager />} />
            <Route path="/locations" element={<LocationManager />} />
            <Route path="/price-locations" element={<SimpleLocationManager />} />
            <Route path="/price-mappings" element={<PriceMappingManager />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 