// backend/api/telemetry.ts
// Anonymous device telemetry ingestion for DocUtility Pro
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      cfg.telemetryStats = cfg.telemetryStats || { totalLaunches: 0 };
      cfg.telemetryStats.totalLaunches = (cfg.telemetryStats.totalLaunches || 0) + 1;
      cfg.telemetryStats.lastLaunchTime = Date.now();
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
    }
  } catch {}

  return res.status(200).json({
    success: true,
    recorded: true,
    timestamp: Date.now(),
  });
}
