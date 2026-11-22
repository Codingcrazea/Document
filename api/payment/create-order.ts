// backend/api/payment/create-order.ts
// Vercel Serverless Function: Secure Razorpay Order & Payment Link Creator
import Razorpay from 'razorpay';
import fs from 'fs';
import path from 'path';

interface VercelRequest {
  method?: string;
  body?: any;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string | string[]>;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: any): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Robust body parsing: stringified JSON fallback
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch {
        parsedBody = {};
      }
    }

    let configuredPrice = 49900;
    try {
      const configPath = path.join(process.cwd(), 'data', 'config.json');
      if (fs.existsSync(configPath)) {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (cfg?.pricing?.vipPriceINR) {
          configuredPrice = cfg.pricing.vipPriceINR * 100;
        }
      }
    } catch {}

    const { amount = configuredPrice, currency = 'INR', receipt = `rcpt_${Date.now()}` } = parsedBody || {};
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_live_rrRegsiFRtrkLi';
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret && keyId !== 'rzp_test_DocUtilityProKey') {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      // 1. Create standard Razorpay Order
      const order = await razorpay.orders.create({
        amount: Number(amount),
        currency,
        receipt,
      });

      // 2. Try generating Razorpay Payment Link, with reliable hosted checkout fallback
      let paymentUrl: string | null = null;
      try {
        const link = await razorpay.paymentLink.create({
          amount: Number(amount),
          currency,
          accept_partial: false,
          description: 'DocUtility Pro VIP Lifetime License',
          reference_id: order.id,
          callback_url: 'https://documentreader-two.vercel.app/api/payment/callback',
          callback_method: 'get',
        });
        paymentUrl = link.short_url;
      } catch (linkErr: any) {
        console.warn('Payment link creation fallback to hosted checkout:', linkErr?.message);
        // Fallback: Hosted Standard Razorpay Checkout URL that works for all accounts
        paymentUrl = `https://documentreader-two.vercel.app/api/payment/checkout?order_id=${order.id}&amount=${order.amount}&key_id=${keyId}`;
      }

      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        keyId: keyId,
        paymentUrl,
        createdAt: Date.now(),
      });
    } else {
      // Development simulated test order or account without secret
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const fallbackUrl = `https://documentreader-two.vercel.app/api/payment/checkout?order_id=${orderId}&amount=${amount}&key_id=${keyId}`;
      return res.status(200).json({
        success: true,
        orderId,
        amount,
        currency,
        receipt,
        keyId: keyId || 'rzp_live_rrRegsiFRtrkLi',
        paymentUrl: fallbackUrl,
        createdAt: Date.now(),
        note: keySecret ? 'Order created' : 'Simulated order (set RAZORPAY_KEY_SECRET in Vercel to activate live gateway)',
      });
    }
  } catch (err: any) {
    const errorMsg =
      err?.error?.description ||
      err?.message ||
      'Failed to create payment order on backend.';
    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
}
