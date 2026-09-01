import { useEffect, useState } from 'react';
import { useAdminStore } from '../store/adminStore';

interface SalesData {
  period: string;
  total_revenue: number;
  order_count: number;
  avg_order_value: number;
}

interface PopularItem {
  id: number;
  name: string;
  total_quantity: number;
  price: string;
}

export default function AnalyticsTab() {
  const token = useAdminStore((s) => s.token);
  const [period, setPeriod] = useState('today');
  const [sales, setSales] = useState<SalesData | null>(null);
  const [popular, setPopular] = useState<PopularItem[]>([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    fetch(`/api/admin/analytics/sales?period=${period}`, { headers })
      .then((r) => r.json()).then(setSales);
    fetch('/api/admin/analytics/popular?limit=10', { headers })
      .then((r) => r.json()).then(setPopular);
  }, [token, period]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex gap-2 mb-4">
          {['today', 'week', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded capitalize ${period === p ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >{p}</button>
          ))}
        </div>

        {sales && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">₹{sales.total_revenue}</p>
              <p className="text-sm text-gray-600">Revenue ({sales.period})</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{sales.order_count}</p>
              <p className="text-sm text-gray-600">Orders</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">₹{Math.round(sales.avg_order_value)}</p>
              <p className="text-sm text-gray-600">Avg Order Value</p>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-3">Popular Items (Top 10)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="pb-2">#</th>
              <th className="pb-2">Item</th>
              <th className="pb-2">Quantity Sold</th>
              <th className="pb-2">Price</th>
            </tr>
          </thead>
          <tbody>
            {popular.map((item, idx) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{idx + 1}</td>
                <td className="py-2">{item.name}</td>
                <td className="py-2 font-bold">{item.total_quantity}</td>
                <td className="py-2">₹{item.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
