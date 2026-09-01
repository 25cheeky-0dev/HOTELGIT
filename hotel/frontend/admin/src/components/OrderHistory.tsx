import { useEffect, useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import { jsPDF } from 'jspdf';

interface Order {
  id: number; table: { name: string }; status: string;
  totalAmount: string; customerNotes: string | null;
  createdAt: string;
  orderItems: Array<{ id: number; menuItem: { name: string }; quantity: number; priceAtTime: string; note: string | null }>;
}

export default function OrderHistory() {
  const token = useAdminStore((s) => s.token);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    fetchOrders();
  }, [token]);

  const fetchOrders = async (status = '') => {
    const url = status ? `/api/admin/orders?status=${status}` : '/api/admin/orders';
    const res = await fetch(url, { headers });
    const data = await res.json();
    setOrders(data.orders || []);
  };

  const cancelOrder = async (id: number) => {
    if (!confirm('Cancel this order?')) return;
    await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    fetchOrders(filter);
  };

  const exportCSV = () => {
    let csv = 'Order ID,Table,Status,Items,Total,Created At\n';
    orders.forEach((o) => {
      const items = o.orderItems.map((i) => `${i.quantity}x ${i.menuItem.name}`).join('; ');
      csv += `${o.id},${o.table.name},${o.status},"${items}",${o.totalAmount},${o.createdAt}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Order Report', 14, 20);
    doc.setFontSize(10);
    let y = 30;
    orders.slice(0, 20).forEach((o) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`#${o.id} | ${o.table.name} | ${o.status} | ₹${o.totalAmount}`, 14, y);
      y += 6;
    });
    doc.save(`orders_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredOrders = filter ? orders.filter((o) => o.status === filter) : orders;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); fetchOrders(e.target.value); }}
          className="border rounded px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="received">Received</option>
          <option value="accepted">Accepted</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="served">Served</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded text-sm">Export CSV</button>
        <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded text-sm">Export PDF</button>
      </div>

      <div className="space-y-2">
        {filteredOrders.map((order) => (
          <div key={order.id} className="border rounded-lg">
            <button
              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            >
              <div className="flex gap-4 items-center">
                <span className="font-bold">#{order.id}</span>
                <span>{order.table.name}</span>
                <span className={`px-2 py-1 rounded text-xs capitalize ${
                  order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  order.status === 'served' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{order.status}</span>
              </div>
              <span className="font-bold">₹{order.totalAmount}</span>
            </button>
            {expandedOrder === order.id && (
              <div className="p-3 border-t bg-gray-50">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.quantity}x {item.menuItem.name}</span>
                    <span>₹{item.priceAtTime}</span>
                  </div>
                ))}
                {order.customerNotes && (
                  <p className="text-sm text-gray-500 mt-2">Note: {order.customerNotes}</p>
                )}
                {order.status !== 'cancelled' && order.status !== 'served' && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="mt-2 text-red-600 text-sm"
                  >Cancel Order</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
