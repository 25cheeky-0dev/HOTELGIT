import { useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import { LayoutDashboard, Menu, ClipboardList, BarChart3, Settings, QrCode, LogOut } from 'lucide-react';
import LiveMonitor from '../components/LiveMonitor';
import MenuManager from '../components/MenuManager';
import OrderHistory from '../components/OrderHistory';
import AnalyticsTab from '../components/AnalyticsTab';
import SettingsTab from '../components/SettingsTab';
import QRCodeManager from '../components/QRCodeManager';

const tabs = [
  { id: 'live', label: 'Live Monitor', icon: LayoutDashboard },
  { id: 'menu', label: 'Menu Manager', icon: Menu },
  { id: 'orders', label: 'Order History', icon: ClipboardList },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'qr', label: 'QR Codes', icon: QrCode },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('live');
  const { username, logout } = useAdminStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Owner Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{username}</span>
            <button onClick={logout} className="text-gray-400 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1 border-b bg-white mt-2 rounded-t-lg overflow-hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-b-lg shadow-sm p-6 mt-1">
          {activeTab === 'live' && <LiveMonitor />}
          {activeTab === 'menu' && <MenuManager />}
          {activeTab === 'orders' && <OrderHistory />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'qr' && <QRCodeManager />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}
