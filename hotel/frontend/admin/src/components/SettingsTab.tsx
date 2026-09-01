import { useEffect, useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import { Save } from 'lucide-react';

export default function SettingsTab() {
  const token = useAdminStore((s) => s.token);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; username: string; role: string; isActive: boolean }>>([]);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/settings', { headers }).then((r) => r.json()).then(setSettings);
    fetch('/api/admin/users', { headers }).then((r) => r.json()).then(setUsers);
  }, [token]);

  const saveSettings = async () => {
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h3 className="font-semibold mb-3">Restaurant Settings</h3>
        <div className="space-y-3">
          {['restaurant_name', 'gst_number', 'kot_header', 'kot_footer', 'currency'].map((key) => (
            <div key={key}>
              <label className="text-sm text-gray-600 capitalize block mb-1">{key.replace('_', ' ')}</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={settings[key] || ''}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              />
            </div>
          ))}
          <button
            onClick={saveSettings}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
          >
            <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Printer Configuration</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Printer Type</label>
            <select className="w-full border rounded px-3 py-2" defaultValue="mock">
              <option value="mock">Mock (Development)</option>
              <option value="usb">USB</option>
              <option value="network">Network</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Printer Address</label>
            <input className="w-full border rounded px-3 py-2" placeholder="/dev/usb/lp0 or 192.168.10.50" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">User Management</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="pb-2">Username</th><th className="pb-2">Role</th><th className="pb-2">Active</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.username}</td>
                <td className="py-2 capitalize">{u.role}</td>
                <td className="py-2">{u.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Database Backup</h3>
        <button className="bg-green-600 text-white px-4 py-2 rounded">Download Backup</button>
        <p className="text-sm text-gray-500 mt-2">Daily backups run automatically at 3:00 AM</p>
      </div>
    </div>
  );
}
