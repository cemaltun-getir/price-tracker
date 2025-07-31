import React, { useState, useEffect } from 'react';
import { categoryAPI, subCategoryAPI } from '../services/api';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '' });
  const [subCategoryFormData, setSubCategoryFormData] = useState({ 
    name: '', 
    category_id: '' 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchSubCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategories = async (categoryId = null) => {
    try {
      const response = await subCategoryAPI.getAll(categoryId);
      setSubCategories(response.data);
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoryAPI.update(editingCategory.id, categoryFormData);
      } else {
        await categoryAPI.create(categoryFormData);
      }
      fetchCategories();
      resetCategoryForm();
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error.response?.data?.error || 'Error saving category');
    }
  };

  const handleSubCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubCategory) {
        await subCategoryAPI.update(editingSubCategory.id, subCategoryFormData);
      } else {
        await subCategoryAPI.create(subCategoryFormData);
      }
      fetchSubCategories(selectedCategory);
      resetSubCategoryForm();
    } catch (error) {
      console.error('Error saving sub-category:', error);
      alert(error.response?.data?.error || 'Error saving sub-category');
    }
  };

  const handleCategoryEdit = (category) => {
    setEditingCategory(category);
    setCategoryFormData({ name: category.name });
    setShowCategoryModal(true);
  };

  const handleSubCategoryEdit = (subCategory) => {
    setEditingSubCategory(subCategory);
    setSubCategoryFormData({ 
      name: subCategory.name, 
      category_id: subCategory.category_id 
    });
    setShowSubCategoryModal(true);
  };

  const handleCategoryDelete = async (category) => {
    const hasSubCategories = category.sub_categories_count > 0;
    const hasProducts = category.skus_count > 0;
    
    let message = `Are you sure you want to delete the category "${category.name}"?`;
    
    if (hasSubCategories || hasProducts) {
      message = `Cannot delete category "${category.name}"\n\n`;
      if (hasSubCategories) {
        message += `• Has ${category.sub_categories_count} sub-category(ies)\n`;
      }
      if (hasProducts) {
        message += `• Used by ${category.skus_count} product(s)\n`;
      }
      message += '\nPlease remove all dependencies first.';
      alert(message);
      return;
    }
    
    if (window.confirm(message)) {
      try {
        await categoryAPI.delete(category.id);
        fetchCategories();
        if (selectedCategory === category.id) {
          setSelectedCategory(null);
          setSubCategories([]);
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert(error.response?.data?.error || 'Error deleting category');
      }
    }
  };

  const handleSubCategoryDelete = async (subCategory) => {
    const hasProducts = subCategory.skus_count > 0;
    
    let message = `Are you sure you want to delete the sub-category "${subCategory.name}"?`;
    
    if (hasProducts) {
      message = `Cannot delete sub-category "${subCategory.name}"\n\n`;
      message += `• Used by ${subCategory.skus_count} product(s)\n`;
      message += '\nPlease change the sub-category of these products first.';
      alert(message);
      return;
    }
    
    if (window.confirm(message)) {
      try {
        await subCategoryAPI.delete(subCategory.id);
        fetchSubCategories(selectedCategory);
      } catch (error) {
        console.error('Error deleting sub-category:', error);
        alert(error.response?.data?.error || 'Error deleting sub-category');
      }
    }
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: '' });
    setEditingCategory(null);
    setShowCategoryModal(false);
  };

  const resetSubCategoryForm = () => {
    setSubCategoryFormData({ name: '', category_id: selectedCategory || '' });
    setEditingSubCategory(null);
    setShowSubCategoryModal(false);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    fetchSubCategories(categoryId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
      </div>

      {/* Categories Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Categories</h2>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add Category
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div 
              key={category.id} 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedCategory === category.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleCategorySelect(category.id)}
            >
                             <h3 className="font-medium text-gray-900 mb-2">{category.name}</h3>
               <div className="text-xs text-gray-500 mb-2">
                 <div>Sub-categories: {category.sub_categories_count}</div>
                 <div>Products: {category.skus_count}</div>
               </div>
               <div className="flex space-x-2">
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     handleCategoryEdit(category);
                   }}
                   className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                 >
                   Edit
                 </button>
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     handleCategoryDelete(category);
                   }}
                   className={`px-2 py-1 rounded text-xs ${
                     category.can_delete 
                       ? 'bg-red-500 text-white hover:bg-red-600' 
                       : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                   }`}
                   disabled={!category.can_delete}
                 >
                   Delete
                 </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Categories Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Sub-Categories {selectedCategory && `(${categories.find(c => c.id === selectedCategory)?.name})`}
          </h2>
          <button
            onClick={() => {
              setSubCategoryFormData({ name: '', category_id: selectedCategory || '' });
              setShowSubCategoryModal(true);
            }}
            disabled={!selectedCategory}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Add Sub-Category
          </button>
        </div>

        {!selectedCategory ? (
          <p className="text-gray-500 text-center py-8">Select a category to view its sub-categories</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subCategories.map((subCategory) => (
                             <div key={subCategory.id} className="border border-gray-200 rounded-lg p-4">
                 <h3 className="font-medium text-gray-900 mb-2">{subCategory.name}</h3>
                 <p className="text-sm text-gray-500 mb-1">Category: {subCategory.category_name}</p>
                 <p className="text-xs text-gray-500 mb-3">Products: {subCategory.skus_count}</p>
                 <div className="flex space-x-2">
                   <button
                     onClick={() => handleSubCategoryEdit(subCategory)}
                     className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                   >
                     Edit
                   </button>
                   <button
                     onClick={() => handleSubCategoryDelete(subCategory)}
                     className={`px-2 py-1 rounded text-xs ${
                       subCategory.can_delete 
                         ? 'bg-red-500 text-white hover:bg-red-600' 
                         : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                     }`}
                     disabled={!subCategory.can_delete}
                   >
                     Delete
                   </button>
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    {editingCategory ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={resetCategoryForm}
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

      {/* Sub-Category Modal */}
      {showSubCategoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSubCategory ? 'Edit Sub-Category' : 'Add New Sub-Category'}
              </h3>
              <form onSubmit={handleSubCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={subCategoryFormData.name}
                    onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    required
                    value={subCategoryFormData.category_id}
                    onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, category_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    {editingSubCategory ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={resetSubCategoryForm}
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

export default CategoryManager; 