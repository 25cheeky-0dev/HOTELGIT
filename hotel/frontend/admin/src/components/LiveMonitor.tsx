import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAdminStore } from '../store/adminStore';

interface DashboardData {
  active_orders: number;
  today_revenue: number;
  avg_order_value: number;
  tables_occupied: string;
  pending_kots: number;
  total_tables: number;
  tables: Array<{ id: number; name: string; status: string; capacity: number }>;
  recent_orders: Array<{
    id: number; table: string; items: string[]; status: string; amount: number;
  }>;
}

export default function LiveMonitor() {
  const [data, setData] = useState<DashboardData | null>(null);
  const token = useAdminStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    const fetchData = () => {
      fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then(setData)
        .catch(console.error);
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    const socket = io();
    socket.emit('join:admin');
    socket.on('order:new', fetchData);
    socket.on('order:status', fetchData);

    return () => { clearInterval(interval); socket.disconnect(); };
  }, [token]);

  if (!data) {
    return <div className="text-center py-8 text-gray-500">Loading dashboard...</div>;
  }

  const statusColor: Record<string, string> = {
    available: 'bg-green-100 border-green-500 text-green-700',
    occupied: 'bg-red-100 border-red-500 text-red-700',
    reserved: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    cleaning: 'bg-gray-100 border-gray-500 text-gray-700',
  };

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{data.active_orders}</p>
          <p className="text-sm text-gray-600">Active Orders</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">₹{data.today_revenue}</p>
          <p className="text-sm text-gray-600">Today's Revenue</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-600">₹{Math.round(data.avg_order_value)}</p>
          <p className="text-sm text-gray-600">Avg Order</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-orange-600">{data.tables_occupied}</p>
          <p className="text-sm text-gray-600">Tables Occupied</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600">{data.pending_kots}</p>
          <p className="text-sm text-gray-600">Pending KOTs</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Table Status Map</h3>
        <div className="grid grid-cols-5 gap-3">
          {data.tables.map((table) => (
            <div
              key={table.id}
              className={`p-3 rounded-lg border-2 text-center ${
                statusColor[table.status] || 'bg-gray-50'
              }`}
            >
              <p className="font-bold">{table.name}</p>
              <p className="text-xs capitalize">{table.status}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Order</th>
                <th className="pb-2">Table</th>
                <th className="pb-2">Items</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="py-2">#{order.id}</td>
                  <td className="py-2">{order.table}</td>
                  <td className="py-2 text-gray-600">
                    {order.items.slice(0, 2).join(', ')}
                    {order.items.length > 2 && '...'}
                  </td>
                  <td className="py-2">
                    <span className="capitalize px-2 py-1 rounded bg-gray-100 text-xs">
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2 text-right">₹{order.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
