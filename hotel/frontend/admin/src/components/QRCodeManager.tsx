import { useEffect, useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import { Download, Printer } from 'lucide-react';

interface QrCode {
  id: number;
  name: string;
  url: string;
  qrDataUrl: string;
}

export default function QRCodeManager() {
  const token = useAdminStore((s) => s.token);
  const { getValidToken, logout } = useAdminStore();
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQrCodes();
  }, [token]);

  const loadQrCodes = async () => {
    setLoading(true);
    try {
      const t = await getValidToken();
      if (!t) { logout(); return; }
      const res = await fetch('/api/admin/qr/tables', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQrCodes(data.qrCodes);
      }
    } catch (err) {
      console.error('Failed to load QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadSvg = async (tableId: number) => {
    const t = await getValidToken();
    if (!t) return;
    const res = await fetch(`/api/admin/qr/tables/${tableId}/svg`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `table_${tableId}_qr.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const printAll = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    let html = `<html><head><title>Table QR Codes</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .page { page-break-after: always; text-align: center; padding: 40px 0; }
        .page:last-child { page-break-after: avoid; }
        h2 { margin-bottom: 10px; }
        img { width: 250px; height: 250px; }
        p { color: #666; margin-top: 8px; font-size: 14px; }
      </style></head><body>`;
    qrCodes.forEach((qr) => {
      html += `<div class="page">
        <h2>${qr.name}</h2>
        <img src="${qr.qrDataUrl}" alt="${qr.name}" />
        <p>Scan to order</p>
      </div>`;
    });
    html += '</body></html>';
    win.document.write(html);
    win.document.close();
    win.print();
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading QR codes...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Table QR Codes</h3>
        <button
          onClick={printAll}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
        >
          <Printer className="w-4 h-4" /> Print All
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Print these QR codes, laminate them, and place on each table. Customers scan to open the menu.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {qrCodes.map((qr) => (
          <div key={qr.id} className="border rounded-lg p-4 text-center">
            <p className="font-bold mb-2">{qr.name}</p>
            <img
              src={qr.qrDataUrl}
              alt={qr.name}
              className="w-full aspect-square mx-auto"
            />
            <p className="text-xs text-gray-500 mt-2 truncate">{qr.url}</p>
            <button
              onClick={() => downloadSvg(qr.id)}
              className="mt-2 flex items-center justify-center gap-1 text-blue-600 text-sm w-full"
            >
              <Download className="w-4 h-4" /> Download SVG
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
