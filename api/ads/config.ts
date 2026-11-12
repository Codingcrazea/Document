// backend/api/ads/config.ts
// Vercel Serverless Function: Custom Ad Campaigns Config for DocUtility Pro

interface VercelRequest {
  method?: string;
  body?: any;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string | string[]>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: any): void;
}

const activeCampaigns = [
  {
    campaignId: 'vip-upgrade-banner',
    placementId: 'home_bottom_banner',
    adType: 'banner',
    title: 'DocUtility Pro VIP License',
    description: 'Lifetime Ad-Free Access & Unlimited Multi-Page Document Merging.',
    ctaText: 'Unlock VIP',
    targetUrl: 'https://docutilitypro.vercel.app/premium',
    priority: 10,
    active: true,
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      customCampaigns: activeCampaigns,
      timestamp: Date.now(),
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
