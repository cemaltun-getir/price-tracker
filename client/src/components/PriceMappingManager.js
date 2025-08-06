import React, { useState, useEffect } from 'react';
import { priceMappingAPI, skuAPI, vendorAPI, simpleLocationAPI } from '../services/api';

const PriceMappingManager = () => {
  const [mappings, setMappings] = useState([]);
  const [skus, setSkus] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [formData, setFormData] = useState({
    sku_id: '',
    vendor_id: '',
    location_id: '',
    price: '',
    struck_price: '',
    is_discounted: false,
    currency: 'USD'
  });
  const [excelFile, setExcelFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mappingResponse, skuResponse, vendorResponse, locationResponse] = await Promise.all([
        priceMappingAPI.getAll(),
        skuAPI.getAll(),
        vendorAPI.getAll(),
        simpleLocationAPI.getAll()
      ]);

      setMappings(mappingResponse.data);
      setSkus(skuResponse.data);
      setVendors(vendorResponse.data);
      setLocations(locationResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate struck price
    if (formData.struck_price && parseFloat(formData.struck_price) >= parseFloat(formData.price)) {
      alert('Struck price must be lower than the regular price');
      return;
    }
    
    try {
      await priceMappingAPI.create(formData);
      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error creating price mapping:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      }
    }
  };

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) return;

    const data = new FormData();
    data.append('excel', excelFile);

    try {
      const response = await priceMappingAPI.uploadExcel(data);
      setUploadResult(response.data);
      fetchData();
      setExcelFile(null);
      setTimeout(() => setUploadResult(null), 5000);
    } catch (error) {
      console.error('Error uploading Excel:', error);
      setUploadResult({ error: 'Upload failed' });
    }
  };



  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this price mapping?')) {
      try {
        await priceMappingAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting price mapping:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      sku_id: '',
      vendor_id: '',
      location_id: '',
      price: '',
      struck_price: '',
      is_discounted: false,
      currency: 'USD'
    });
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Price Mapping Management</h1>
        <div className="space-x-4">
          <button
            onClick={() => setShowExcelModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Upload Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add Price Mapping
          </button>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`mb-4 p-4 rounded ${uploadResult.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {uploadResult.error ? (
            <p>Error: {uploadResult.error}</p>
          ) : (
            <div>
              <p>Upload completed! Success: {uploadResult.successCount}, Errors: {uploadResult.errorCount}</p>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <ul className="mt-2 list-disc list-inside">
                  {uploadResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Price Mappings Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          {mappings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No price mappings found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Struck Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discounted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mappings.map((mapping) => (
                    <tr key={mapping.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{mapping.sku_name}</div>
                          <div className="text-sm text-gray-500">{mapping.brand} - {mapping.unit_value}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.vendor_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">
                          {mapping.location_name || 'Unknown Location'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.struck_price ? (
                          <span className="line-through text-gray-500">
                            {mapping.currency} {mapping.price}
                          </span>
                        ) : (
                          <span className="text-gray-900">
                            {mapping.currency} {mapping.price}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.struck_price ? (
                          <div>
                            <span className="text-green-600 font-medium">
                              {mapping.currency} {mapping.struck_price}
                            </span>
                            <div className="text-xs text-green-600 font-medium">
                              -{Math.round(((mapping.price - mapping.struck_price) / mapping.price) * 100)}% off
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.is_discounted ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mapping.currency} {mapping.unit_price ? mapping.unit_price.toFixed(4) : 'N/A'}
                        <div className="text-xs text-gray-500">per {mapping.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mapping.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDelete(mapping.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Price Mapping Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Price Mapping</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <select
                    required
                    value={formData.sku_id}
                    onChange={(e) => setFormData({ ...formData, sku_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select SKU</option>
                    {skus.map((sku) => (
                      <option key={sku.id} value={sku.id}>
                        {sku.name} - {sku.brand}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor</label>
                  <select
                    required
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <select
                    required
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unit price will be automatically calculated based on the SKU's unit value
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Struck Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.struck_price}
                    onChange={(e) => setFormData({ ...formData, struck_price: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Discounted price (must be lower than current price)
                  </p>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_discounted}
                      onChange={(e) => setFormData({ ...formData, is_discounted: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Is Discounted</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="TRY">TRY</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Excel File</h3>
              <div className="mb-4 p-4 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  Excel file should have columns: sku_id, vendor_id, location_id, price, struck_price (optional), is_discounted (optional), currency
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Use the actual database IDs for SKUs, vendors, and price locations. You can find these IDs in their respective management pages.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <strong>Note:</strong> Use simple location IDs from the "Price Locations" tab, not the complex location IDs from the "Locations" tab.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <strong>Note:</strong> Unit price will be automatically calculated by dividing the price by the SKU's unit value.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <strong>Note:</strong> struck_price must be lower than price if provided. is_discounted should be true/false.
                </p>
              </div>
              <form onSubmit={handleExcelUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Excel File</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    required
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExcelModal(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceMappingManager; 