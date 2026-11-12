// backend/api/payment/create-order.ts
// Vercel Serverless Function: Secure Razorpay Order Creator
import Razorpay from 'razorpay';

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
  // Support CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount = 49900, currency = 'INR', receipt = `rcpt_${Date.now()}` } = req.body || {};
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      // Production / Live Razorpay Order via official SDK
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const order = await razorpay.orders.create({
        amount: Number(amount),
        currency,
        receipt,
      });

      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        keyId: keyId,
        createdAt: Date.now(),
      });
    } else {
      // Fallback / Simulated Test Order when running without live merchant keys
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return res.status(200).json({
        success: true,
        orderId,
        amount,
        currency,
        receipt,
        keyId: keyId || 'rzp_test_DocUtilityProKey',
        createdAt: Date.now(),
        note: 'Simulated order (set RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in Vercel to activate live gateway)',
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to create payment order on backend.',
    });
  }
}
