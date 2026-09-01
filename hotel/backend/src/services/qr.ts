import QRCode from 'qrcode';

export interface QrTableData {
  id: number;
  name: string;
  url: string;
}

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
}

export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    width: 300,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
}

export function buildTableUrl(tableId: number, qrToken: string): string {
  const host = process.env.HOST_URL || 'http://localhost';
  return `${host}/table/${tableId}?t=${qrToken}`;
}
