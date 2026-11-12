// backend/api/profile.ts
// Vercel Serverless Function: Voluntary Guest Profile Submission

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

interface GuestProfilePayload {
  guestId: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { guestId, name, email, phoneNumber } = req.body as GuestProfilePayload;

    if (!guestId || typeof guestId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_GUEST_ID', message: 'Valid guestId is required.' },
      });
    }

    // Basic email format validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Provided email format is invalid.' },
      });
    }

    // In production with Supabase connected, insert into guest_profiles table
    // For now, accept and acknowledge receipt
    return res.status(200).json({
      success: true,
      message: 'Guest profile submitted successfully.',
      data: {
        guestId,
        receivedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Internal server error' },
    });
  }
}

