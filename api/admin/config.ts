// backend/api/admin/config.ts
// Configuration Endpoint: Reads & Updates DocUtility Pro Pricing and Ads
import fs from 'fs';
import path from 'path';

interface VercelRequest {
  method?: string;
  body?: any;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: any): void;
}

// In-memory cache fallback for serverless execution
let memoryConfig = {
  pricing: {
    vipPriceINR: 499,
    currency: 'INR',
    lifetimeEnabled: true,
  },
  ads: [
    {
      campaignId: 'camp_default_01',
      title: 'Unlock Unlimited Conversions',
      description: 'Go Premium today for zero ads and priority batch processing.',
      ctaText: 'Upgrade Now',
      targetUrl: 'https://documentreader-two.vercel.app/api/payment/checkout',
      placementId: 'home_bottom_banner',
      adType: 'banner',
      priority: 10,
      active: true,
      displayIntervalSeconds: 60,
      imageUrl: '',
    },
  ],
};

function getConfigFile(): any {
  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch {}
  return memoryConfig;
}

function saveConfigFile(data: any) {
  memoryConfig = data;
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const configPath = path.join(dataDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    saveConfigFile(body);
    return res.status(200).json({ success: true, message: 'Configuration saved successfully.' });
  }

  // GET
  const config = getConfigFile();
  return res.status(200).json(config);
}

