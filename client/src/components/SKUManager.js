import React, { useState, useEffect } from 'react';
import { skuAPI, categoryAPI, subCategoryAPI } from '../services/api';

// Helper function to get the correct image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL (Cloudinary), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Otherwise, it's a local filename, construct the URL
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? window.location.origin 
    : 'http://localhost:3001';
  return `${baseUrl}/uploads/images/${imagePath}`;
};

const SKUManager = () => {
  const [skus, setSkus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSku, setEditingSku] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    unit: '',
    unit_value: '',
    category_id: '',
    sub_category_id: '',
    kvi_label: 'Background (BG)',
    buying_price: '',
    buying_vat: '',
    image: null
  });
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchSkus();
    fetchCategories();
  }, []);

  const fetchSkus = async () => {
    try {
      const response = await skuAPI.getAll();
      setSkus(response.data);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubCategories = async (categoryId) => {
    try {
      const response = await subCategoryAPI.getAll(categoryId);
      setSubCategories(response.data);
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setFormData({ ...formData, category_id: categoryId, sub_category_id: '' });
    setSubCategories([]);
    if (categoryId) {
      fetchSubCategories(categoryId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('brand', formData.brand);
    data.append('unit', formData.unit);
    data.append('unit_value', formData.unit_value);
    data.append('category_id', formData.category_id);
    data.append('sub_category_id', formData.sub_category_id);
    data.append('kvi_label', formData.kvi_label);
    data.append('buying_price', formData.buying_price);
    data.append('buying_vat', formData.buying_vat);
    if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      if (editingSku) {
        await skuAPI.update(editingSku.id, data);
      } else {
        await skuAPI.create(data);
      }
      fetchSkus();
      resetForm();
    } catch (error) {
      console.error('Error saving SKU:', error);
    }
  };

  const handleEdit = (sku) => {
    setEditingSku(sku);
    setFormData({
      name: sku.name,
      brand: sku.brand,
      unit: sku.unit,
      unit_value: sku.unit_value,
      category_id: sku.category_id || '',
      sub_category_id: sku.sub_category_id || '',
      kvi_label: sku.kvi_label || 'Background (BG)',
      buying_price: sku.buying_price || '',
      buying_vat: sku.buying_vat || '',
      image: null
    });
    // Load sub-categories for the selected category
    if (sku.category_id) {
      fetchSubCategories(sku.category_id);
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this SKU?')) {
      try {
        await skuAPI.delete(id);
        fetchSkus();
      } catch (error) {
        console.error('Error deleting SKU:', error);
      }
    }
  };

  const copyToClipboard = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      unit: '',
      unit_value: '',
      category_id: '',
      sub_category_id: '',
      kvi_label: 'Background (BG)',
      buying_price: '',
      buying_vat: '',
      image: null
    });
    setSubCategories([]);
    setEditingSku(null);
    setShowModal(false);
  };

  const units = ['piece', 'kg', 'liters', 'grams', 'ml', 'pounds', 'ounces'];
  const kviLabels = ['SKVI', 'KVI', 'Background (BG)', 'Foreground (FG)'];

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
        <h1 className="text-3xl font-bold text-gray-900">SKU Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add New SKU
        </button>
      </div>

      {/* SKU Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skus.map((sku) => (
          <div key={sku.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="h-48 bg-gray-200 flex items-center justify-center">
              {sku.image ? (
                <img
                  src={getImageUrl(sku.image)}
                  alt={sku.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              {!sku.image && <div className="text-gray-400">No Image</div>}
              <div className="text-gray-400 hidden">Image not found</div>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{sku.name}</h3>
              <p className="text-gray-600 mb-1">Brand: {sku.brand}</p>
              <p className="text-gray-600 mb-1">Category: {sku.category_name}</p>
              <p className="text-gray-600 mb-1">Sub-Category: {sku.sub_category_name}</p>
              <p className="text-gray-600 mb-1">Unit: {sku.unit}</p>
              <p className="text-gray-600 mb-1">Value: {sku.unit_value}</p>
              {sku.buying_price > 0 && (
                <div className="mb-2">
                  <p className="text-gray-600 mb-1">Buying Price: ${sku.buying_price}</p>
                  <p className="text-gray-600 mb-1">Buying VAT: {sku.buying_vat}%</p>
                  <p className="text-gray-600 mb-1 font-semibold">Price without VAT: ${sku.buying_price_without_vat?.toFixed(2)}</p>
                </div>
              )}
              <div className="mb-2">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  sku.kvi_label === 'SKVI' ? 'bg-red-100 text-red-800' :
                  sku.kvi_label === 'KVI' ? 'bg-orange-100 text-orange-800' :
                  sku.kvi_label === 'Foreground (FG)' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {sku.kvi_label || 'Background (BG)'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4 font-mono">ID: {sku.id}</p>
              <div className="flex space-x-2 flex-wrap">
                <button
                  onClick={() => handleEdit(sku)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(sku.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => copyToClipboard(sku.id)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    copiedId === sku.id 
                      ? 'bg-green-500 text-white' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {copiedId === sku.id ? 'Copied!' : 'Copy ID'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSku ? 'Edit SKU' : 'Add New SKU'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Unit</option>
                    {units.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit Value</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 100g, 2 pieces"
                    value={formData.unit_value}
                    onChange={(e) => setFormData({ ...formData, unit_value: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">Note: Category is optional for now. You can create categories in the Categories page.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sub-Category</label>
                  <select
                    value={formData.sub_category_id}
                    onChange={(e) => setFormData({ ...formData, sub_category_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    disabled={!formData.category_id}
                  >
                    <option value="">Select Sub-Category</option>
                    {subCategories.map((subCategory) => (
                      <option key={subCategory.id} value={subCategory.id}>{subCategory.name}</option>
                    ))}
                  </select>
                  {!formData.category_id && (
                    <p className="text-sm text-gray-500 mt-1">Please select a category first</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">KVI Label</label>
                  <select
                    value={formData.kvi_label}
                    onChange={(e) => setFormData({ ...formData, kvi_label: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {kviLabels.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">SKVI = Super Key Value Item, KVI = Key Value Item</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Buying Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.buying_price}
                    onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">Enter the buying price including VAT</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Buying VAT (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={formData.buying_vat}
                    onChange={(e) => setFormData({ ...formData, buying_vat: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">Enter the VAT percentage (e.g., 20 for 20%)</p>
                </div>
                {formData.buying_price && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-blue-800">Price Calculation Preview:</p>
                    <p className="text-sm text-blue-700">
                      Price without VAT: ${
                        (() => {
                          const price = parseFloat(formData.buying_price) || 0;
                          const vat = parseFloat(formData.buying_vat) || 0;
                          if (price && vat > 0) {
                            return (price / (1 + (vat / 100))).toFixed(2);
                          } else if (price) {
                            return price.toFixed(2);
                          }
                          return '0.00';
                        })()
                      }
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    {editingSku ? 'Update' : 'Create'}
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
    </div>
  );
};

export default SKUManager; 