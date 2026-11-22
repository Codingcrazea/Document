// backend/api/admin/index.ts
// Interactive Admin Panel Handler for Vercel Serverless
import fs from 'fs';
import path from 'path';

interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[]>;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  send(body: string): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // Candidate paths where admin.html might be located in development & Vercel serverless bundle
  const candidatePaths = [
    path.join(__dirname, 'admin.html'),
    path.join(__dirname, '..', 'admin.html'),
    path.join(__dirname, '..', '..', 'admin.html'),
    path.join(process.cwd(), 'admin.html'),
    path.join(process.cwd(), 'backend', 'admin.html'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const html = fs.readFileSync(p, 'utf8');
        return res.status(200).send(html);
      }
    } catch {}
  }

  // Fallback: If static file is unavailable in bundle, serve standard response
  res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>DocUtility Pro Admin Hub</title></head>
<body style="background:#0B0F19;color:#fff;font-family:sans-serif;padding:40px;text-align:center;">
  <h2>DocUtility Pro Admin Hub</h2>
  <p>Admin panel static asset could not be located on this path.</p>
  <a href="/api/admin/config" style="color:#38BDF8;">View Active Config JSON</a>
</body>
</html>`);
}
