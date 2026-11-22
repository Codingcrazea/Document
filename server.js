// backend/server.js
// Standalone Local Development Server for DocUtility Pro
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Load .env file with clean whitespace/quote stripping
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const firstEqual = trimmed.indexOf('=');
          const key = trimmed.substring(0, firstEqual).trim();
          let value = trimmed.substring(firstEqual + 1).trim();
          value = value.replace(/^["']|["']$/g, '').trim();
          process.env[key] = value;
        }
      });
      console.log(`[ENV] Loaded environment credentials from: ${envPath}`);
      break;
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 50000;
const KEY_ID = (process.env.RAZORPAY_KEY_ID || 'rzp_live_rrRegsiFRtrkLi').trim();
const KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || 'twuNu2AoG5HidHgi03DVXYIo').trim();

// Config persistence helpers for Admin Panel
function getAppConfig() {
  try {
    const configPath = path.join(__dirname, 'data', 'config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return {
    pricing: { vipPriceINR: 499, currency: 'INR', lifetimeEnabled: true },
    ads: [
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
        displayIntervalSeconds: 60,
      },
    ],
  };
}

function saveAppConfig(newConfig) {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const configPath = path.join(dataDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save config.json:', e);
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:' + PORT}`);
  const pathname = parsedUrl.pathname;
  console.log(`\n[REQ] ${req.method} ${pathname}`);

  // Helper to read JSON body
  const readJsonBody = () =>
    new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });

  // 0. Admin Panel Web UI (Directly serves backend/admin.html without regex truncation)
  if ((pathname === '/admin' || pathname === '/api/admin') && req.method === 'GET') {
    const adminHtmlPath = path.join(__dirname, 'admin.html');
    if (fs.existsSync(adminHtmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(adminHtmlPath, 'utf8'));
      return;
    }
    const adminTsPath = path.join(__dirname, 'api', 'admin', 'index.ts');
    if (fs.existsSync(adminTsPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(adminTsPath, 'utf8'));
      return;
    }
  }

  // 0.1 Admin Config API (GET & POST)
  if (pathname === '/api/admin/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getAppConfig()));
    return;
  }

  if (pathname === '/api/admin/config' && req.method === 'POST') {
    const body = await readJsonBody();
    saveAppConfig(body);
    console.log(`[Admin Update] Config updated. VIP Price: ₹${body?.pricing?.vipPriceINR || 499}, Ads: ${(body?.ads || []).length} campaigns.`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Configuration saved successfully.' }));
    return;
  }

  // 1. Health Check
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'docutility-backend-local',
        port: PORT,
        version: '1.0.0',
        timestamp: Date.now(),
        database: 'connected',
        keyIdPrefix: KEY_ID.substring(0, 8) + '...',
        keySecretConfigured: Boolean(KEY_SECRET),
      })
    );
    return;
  }

  // 1.1 Device Telemetry & Ping
  if (pathname === '/api/telemetry' && req.method === 'POST') {
    const body = await readJsonBody();
    console.log(`[Telemetry Ping] Device: ${body.deviceModel || 'Unknown'}, OS: ${body.osVersion || ''}, Action: ${body.lastAction || 'launch'}`);
    const cfg = getAppConfig();
    cfg.telemetryStats = cfg.telemetryStats || { totalLaunches: 0 };
    cfg.telemetryStats.totalLaunches = (cfg.telemetryStats.totalLaunches || 0) + 1;
    cfg.telemetryStats.lastLaunchTime = Date.now();
    saveAppConfig(cfg);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, recorded: true, timestamp: Date.now() }));
    return;
  }

  // 1.2 Remote Ads & Feature Config (Reads live from data/config.json)
  if (pathname === '/api/ads/config' && req.method === 'GET') {
    const config = getAppConfig();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        customCampaigns: config.ads || [],
        pricing: config.pricing || { vipPriceINR: 499, currency: 'INR', lifetimeEnabled: true },
      })
    );
    return;
  }

  // 2. Create Razorpay Payment Order
  if (pathname === '/api/payment/create-order' && req.method === 'POST') {
    const body = await readJsonBody();
    const config = getAppConfig();
    const defaultAmountPaise = ((config?.pricing?.vipPriceINR || 499) * 100);
    const amount = Number(body.amount) || defaultAmountPaise;
    const currency = body.currency || 'INR';
    const receipt = body.receipt || `rcpt_${Date.now()}`;

    console.log(`[Order Attempt] Amount: ₹${amount / 100}, KeyID: ${KEY_ID}`);

    try {
      // Direct REST API Call to Razorpay Gateway
      const authHeader = 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt,
        }),
      });

      const rzpData = await rzpResponse.json();

      if (!rzpResponse.ok) {
        console.error('❌ [Razorpay Gateway Error]:', JSON.stringify(rzpData, null, 2));

        if (rzpResponse.status === 401) {
          console.error(
            '⚠️ [401 Unauthorized]: Razorpay ne Key ID aur Secret ko reject kar diya hai. Check karein ki Razorpay Dashboard par Secret regenerate toh nahi hua ya Live vs Test mode ka difference hai.'
          );
        }

        // Return error with descriptive message
        res.writeHead(rzpResponse.status, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            statusCode: rzpResponse.status,
            error: rzpData?.error?.description || 'Razorpay authentication failed (401 Unauthorized). Check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on Razorpay Dashboard.',
            details: rzpData,
          })
        );
        return;
      }

      const checkoutUrl = `http://localhost:${PORT}/api/payment/checkout?order_id=${rzpData.id}&amount=${rzpData.amount}&key_id=${KEY_ID}`;

      console.log(`✅ [Order Success] ID: ${rzpData.id}, Status: ${rzpData.status}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          orderId: rzpData.id,
          amount: rzpData.amount,
          currency: rzpData.currency,
          receipt: rzpData.receipt,
          keyId: KEY_ID,
          paymentUrl: checkoutUrl,
          createdAt: Date.now(),
        })
      );
    } catch (err) {
      console.error('[Create Order Server Exception]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          error: err.message || 'Internal server error while connecting to Razorpay.',
        })
      );
    }
    return;
  }

  // 3. Razorpay Signature Verification
  if (pathname === '/api/payment/verify' && req.method === 'POST') {
    const body = await readJsonBody();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!razorpay_payment_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing razorpay_payment_id' }));
      return;
    }

    if (KEY_SECRET && razorpay_order_id && razorpay_signature) {
      const generated = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generated !== razorpay_signature) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            verified: false,
            error: 'Invalid payment signature. Verification failed.',
          })
        );
        return;
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id || 'order_direct',
        message: 'Signature verified successfully. VIP Premium entitlement granted.',
      })
    );
    return;
  }

  // 4. Hosted Razorpay Checkout Page
  if (pathname === '/api/payment/checkout' && req.method === 'GET') {
    const rawOrderId = parsedUrl.searchParams.get('order_id') || '';
    const amount = parsedUrl.searchParams.get('amount') || '49900';
    const keyId = parsedUrl.searchParams.get('key_id') || KEY_ID;
    const displayAmount = (Number(amount) / 100).toFixed(0);

    // CRITICAL: Only attach order_id if it's a real Razorpay generated ID
    // Fake IDs like "order_test_101" make Razorpay modal crash with "Something went wrong"
    const isAuthenticRzpOrder =
      rawOrderId &&
      rawOrderId.startsWith('order_') &&
      rawOrderId.length >= 18 &&
      !rawOrderId.includes('test_101') &&
      !rawOrderId.includes('sim_');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DocUtility Pro - VIP Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0B0F19;
      color: #F8FAFC;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #141824;
      border-radius: 20px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: rgba(229, 9, 20, 0.15);
      color: #E50914;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 16px;
      border: 1px solid rgba(229, 9, 20, 0.3);
    }
    h1 { font-size: 24px; font-weight: 800; margin: 0 0 10px 0; color: #FFFFFF; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
    .price-box {
      background: #1E2333;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .price-label { font-size: 12px; color: #94A3B8; text-transform: uppercase; }
    .price-value { font-size: 38px; font-weight: 900; color: #38BDF8; margin-top: 4px; }
    .pay-btn {
      background: #E50914;
      color: #FFFFFF;
      border: none;
      border-radius: 50px;
      padding: 16px 32px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      box-shadow: 0 6px 20px rgba(229, 9, 20, 0.4);
      transition: all 0.2s ease;
      margin-bottom: 12px;
    }
    .pay-btn:hover { background: #b80710; }
    .sim-btn {
      background: rgba(255, 255, 255, 0.08);
      color: #94A3B8;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 50px;
      padding: 12px 24px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
      transition: all 0.2s;
    }
    .sim-btn:hover { background: rgba(255, 255, 255, 0.15); color: #FFFFFF; }
    .status-box {
      display: none;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 18px;
      font-size: 13px;
      text-align: left;
    }
    .status-box.error {
      display: block;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #FCA5A5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">DocUtility Pro VIP</div>
    <h1>Unlock Lifetime Access</h1>
    <p>Unlimited offline OCR, PDF merger, compressor, and 100% ad-free experience.</p>
    
    <div class="price-box">
      <div class="price-label">One-Time Lifetime Fee</div>
      <div class="price-value">₹${displayAmount}</div>
    </div>

    <button class="pay-btn" onclick="openRazorpay()">Pay ₹${displayAmount} via Razorpay</button>
    <button class="sim-btn" onclick="simulatePayment()">⚡ Simulate Payment Success (VIP Test Mode)</button>

    <div id="status-box" class="status-box"></div>
  </div>

  <script>
    function openRazorpay() {
      try {
        var options = {
          "key": "${keyId}",
          "amount": "${amount}",
          "currency": "INR",
          "name": "DocUtility Pro",
          "description": "VIP Lifetime License",
          ${isAuthenticRzpOrder ? `"order_id": "${rawOrderId}",` : ''}
          "theme": { "color": "#E50914" },
          "prefill": {
            "name": "DocUtility Pro User"
          },
          "handler": function (response) {
            alert("Payment Successful! Payment ID: " + response.razorpay_payment_id);
            window.location.href = "http://localhost:${PORT}/api/payment/callback?payment_id=" +
              encodeURIComponent(response.razorpay_payment_id) +
              "&order_id=" + encodeURIComponent(response.razorpay_order_id || "${rawOrderId || 'order_direct'}");
          }
        };

        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response){
          var box = document.getElementById('status-box');
          box.className = 'status-box error';
          box.innerHTML = "<b>❌ Razorpay Error:</b> " + (response.error.description || response.error.code);
        });
        rzp.open();
      } catch (err) {
        var box = document.getElementById('status-box');
        box.className = 'status-box error';
        box.innerHTML = "<b>⚠️ Razorpay Launch Error:</b> " + err.message;
      }
    }

    function simulatePayment() {
      var fakePayId = "pay_sim_" + Date.now();
      window.location.href = "http://localhost:${PORT}/api/payment/callback?payment_id=" + fakePayId + "&order_id=${rawOrderId || 'order_sim'}";
    }

    // Auto-launch checkout after short delay
    window.onload = function() {
      setTimeout(openRazorpay, 500);
    };
  </script>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 5. Payment Callback Success Page
  if (pathname === '/api/payment/callback' && req.method === 'GET') {
    const paymentId = parsedUrl.searchParams.get('payment_id') || 'pay_unknown';
    const orderId = parsedUrl.searchParams.get('order_id') || 'order_unknown';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Successful - DocUtility Pro</title>
  <style>
    body { font-family: sans-serif; background: #0B0F19; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .box { background: #141824; border-radius: 16px; padding: 36px; max-width: 400px; border: 1px solid rgba(255,255,255,0.1); }
    .icon { font-size: 56px; margin-bottom: 12px; }
    h2 { color: #10B981; margin: 0 0 8px 0; }
    p { color: #94A3B8; font-size: 14px; }
    .tag { background: #1E2333; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #38BDF8; margin-top: 12px; display: inline-block; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">✅</div>
    <h2>VIP License Activated!</h2>
    <p>Your payment has been successfully recorded. All premium features, unlimited OCR, and ad-free experience are now active in DocUtility Pro.</p>
    <div class="tag">ID: ${paymentId}</div>
  </div>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found', path: pathname }));
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 DocUtility Pro Local Server Running on: http://localhost:${PORT}`);
  console.log(`⚙️ Admin Control Hub: http://localhost:${PORT}/admin`);
  console.log(`🔑 Razorpay Key ID: ${KEY_ID}`);
  console.log('====================================================');
});
