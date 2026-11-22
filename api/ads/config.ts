// backend/api/ads/config.ts
// Remote Custom Ads Campaign & Pricing Configuration for DocUtility Pro
import fs from 'fs';
import path from 'path';

interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: any): void;
}

const defaultCampaigns = [
  {
    campaignId: 'default-welcome-banner',
    placementId: 'home_bottom_banner',
    adType: 'banner',
    title: 'Unlock Unlimited Conversions',
    description: 'Go Premium today for zero ads and priority batch processing.',
    ctaText: 'Upgrade Now',
    targetUrl: 'https://documentreader-two.vercel.app/api/payment/checkout',
    priority: 10,
    active: true,
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  let campaigns = defaultCampaigns;
  let pricing = { vipPriceINR: 499, currency: 'INR', lifetimeEnabled: true };

  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (Array.isArray(data.ads)) {
        campaigns = data.ads;
      }
      if (data.pricing) {
        pricing = data.pricing;
      }
    }
  } catch {}

  return res.status(200).json({
    success: true,
    customCampaigns: campaigns,
    pricing,
  });
}
