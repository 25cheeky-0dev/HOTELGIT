import { useEffect, useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

interface Category {
  id: number; name: string; displayOrder: number; isActive: boolean; _count: { items: number };
}

interface MenuItem {
  id: number; name: string; description: string | null; price: string;
  isAvailable: boolean; isVeg: boolean; spiceLevel: number; prepTimeMin: number;
  categoryId: number | null; category: { name: string } | null;
}

export default function MenuManager() {
  const token = useAdminStore((s) => s.token);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'items'>('categories');
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null>(null);
  const [editCategory, setEditCategory] = useState<Partial<Category> | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/menu/categories', { headers }).then((r) => r.json()).then(setCategories);
    fetch('/api/admin/menu/items', { headers }).then((r) => r.json()).then(setItems);
  }, [token]);

  const saveCategory = async () => {
    if (!editCategory?.name) return;
    const method = editCategory.id ? 'PUT' : 'POST';
    const url = editCategory.id
      ? `/api/admin/menu/categories/${editCategory.id}`
      : '/api/admin/menu/categories';

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify({ name: editCategory.name, display_order: editCategory.displayOrder || 0 }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) => {
        if (editCategory.id) return prev.map((c) => (c.id === data.id ? data : c));
        return [...prev, data];
      });
      setEditCategory(null);
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    const res = await fetch(`/api/admin/menu/categories/${id}`, { method: 'DELETE', headers });
    if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const saveItem = async () => {
    if (!editItem?.name || !editItem?.price) return;
    const method = editItem.id ? 'PUT' : 'POST';
    const url = editItem.id ? `/api/admin/menu/items/${editItem.id}` : '/api/admin/menu/items';
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(editItem),
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => {
        if (editItem.id) return prev.map((i) => (i.id === data.id ? data : i));
        return [...prev, data];
      });
      setEditItem(null);
    }
  };

  const toggleAvailability = async (id: number, isAvailable: boolean) => {
    const res = await fetch(`/api/admin/menu/items/${id}/availability`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_available: isAvailable }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isAvailable } : i)));
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    const res = await fetch(`/api/admin/menu/items/${id}`, { method: 'DELETE', headers });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded ${activeTab === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >Categories</button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 rounded ${activeTab === 'items' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >Items</button>
      </div>

      {activeTab === 'categories' && (
        <div>
          <button
            onClick={() => setEditCategory({ name: '', displayOrder: 0 })}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded mb-4"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>

          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th className="pb-2">Name</th><th className="pb-2">Order</th><th className="pb-2">Items</th><th className="pb-2">Active</th><th className="pb-2">Actions</th></tr></thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b">
                  <td className="py-2">{cat.name}</td>
                  <td className="py-2">{cat.displayOrder}</td>
                  <td className="py-2">{cat._count.items}</td>
                  <td className="py-2">{cat.isActive ? 'Yes' : 'No'}</td>
                  <td className="py-2 flex gap-2">
                    <button onClick={() => setEditCategory(cat)} className="text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteCategory(cat.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {editCategory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20" onClick={() => setEditCategory(null)}>
              <div className="bg-white p-6 rounded-lg w-96" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold mb-4">{editCategory.id ? 'Edit' : 'Add'} Category</h3>
                <input className="w-full border rounded px-3 py-2 mb-3" placeholder="Name" value={editCategory.name || ''} onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })} />
                <input className="w-full border rounded px-3 py-2 mb-3" type="number" placeholder="Display Order" value={editCategory.displayOrder || 0} onChange={(e) => setEditCategory({ ...editCategory, displayOrder: parseInt(e.target.value) || 0 })} />
                <div className="flex gap-2">
                  <button onClick={saveCategory} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                  <button onClick={() => setEditCategory(null)} className="bg-gray-200 px-4 py-2 rounded flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <div>
          <button
            onClick={() => setEditItem({ name: '', price: '0', isVeg: true, isAvailable: true, spiceLevel: 0, prepTimeMin: 15 })}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded mb-4"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>

          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th className="pb-2">Name</th><th className="pb-2">Category</th><th className="pb-2">Price</th><th className="pb-2">Veg</th><th className="pb-2">Available</th><th className="pb-2">Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2">{item.category?.name || '-'}</td>
                  <td className="py-2">₹{item.price}</td>
                  <td className="py-2">{item.isVeg ? '🥬' : '🍗'}</td>
                  <td className="py-2">
                    <button
                      onClick={() => toggleAvailability(item.id, !item.isAvailable)}
                      className={`px-2 py-1 rounded text-xs ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {item.isAvailable ? 'In Stock' : '86'}
                    </button>
                  </td>
                  <td className="py-2 flex gap-2">
                    <button onClick={() => setEditItem(item)} className="text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteItem(item.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {editItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20" onClick={() => setEditItem(null)}>
              <div className="bg-white p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold mb-4">{editItem.id ? 'Edit' : 'Add'} Item</h3>
                <input className="w-full border rounded px-3 py-2 mb-3" placeholder="Name" value={editItem.name || ''} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
                <select className="w-full border rounded px-3 py-2 mb-3" value={editItem.categoryId || ''} onChange={(e) => setEditItem({ ...editItem, categoryId: e.target.value ? parseInt(e.target.value) : null })}>
                  <option value="">No Category</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <input className="w-full border rounded px-3 py-2 mb-3" type="number" step="0.01" placeholder="Price" value={editItem.price || '0'} onChange={(e) => setEditItem({ ...editItem, price: e.target.value })} />
                <textarea className="w-full border rounded px-3 py-2 mb-3" placeholder="Description" value={editItem.description || ''} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} />
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editItem.isVeg ?? true} onChange={(e) => setEditItem({ ...editItem, isVeg: e.target.checked })} /> Veg</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editItem.isAvailable ?? true} onChange={(e) => setEditItem({ ...editItem, isAvailable: e.target.checked })} /> Available</label>
                </div>
                <input className="w-full border rounded px-3 py-2 mb-3" type="number" placeholder="Prep Time (min)" value={editItem.prepTimeMin || 15} onChange={(e) => setEditItem({ ...editItem, prepTimeMin: parseInt(e.target.value) || 15 })} />
                <input className="w-full border rounded px-3 py-2 mb-3" type="number" min="0" max="3" placeholder="Spice Level (0-3)" value={editItem.spiceLevel ?? 0} onChange={(e) => setEditItem({ ...editItem, spiceLevel: parseInt(e.target.value) || 0 })} />
                <div className="flex gap-2">
                  <button onClick={saveItem} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                  <button onClick={() => setEditItem(null)} className="bg-gray-200 px-4 py-2 rounded flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
