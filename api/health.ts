// backend/api/health.ts
// Vercel Serverless Function: Light health check for the 3-stage startup gate

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    status: 'healthy',
    service: 'docutility-backend-api',
    version: '1.0.0',
    timestamp: Date.now(),
    database: 'connected',
  });
}

