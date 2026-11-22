// backend/api/payment/callback.ts
// Success callback page after Razorpay Checkout completion

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
  const paymentId = req.query?.razorpay_payment_id || '';
  const orderId = req.query?.razorpay_payment_link_reference_id || req.query?.razorpay_order_id || '';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful - DocUtility Pro</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #0A0E1A;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          text-align: center;
          padding: 20px;
        }
        .card {
          background: #141824;
          border-radius: 16px;
          padding: 36px 24px;
          max-width: 420px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .icon {
          font-size: 56px;
          margin-bottom: 16px;
        }
        h1 {
          color: #4CAF50;
          font-size: 24px;
          margin: 0 0 10px;
        }
        p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 24px;
        }
        .btn {
          display: inline-block;
          background: #E50914;
          color: #FFFFFF;
          padding: 12px 28px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">🎉</div>
        <h1>Payment Successful!</h1>
        <p>Your payment (${paymentId}) has been received and VIP Lifetime Access is unlocked.</p>
        <p>You can now return to the <strong>DocUtility Pro</strong> app.</p>
        <a href="intent://#Intent;package=com.docutilitypro;end" class="btn">Return to App</a>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}

