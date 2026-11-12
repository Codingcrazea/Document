# DocUtility Pro - Serverless Backend API

Fast, lightweight Vercel Serverless Backend powering DocUtility Pro (Razorpay Payment Gateway, Remote Ads & Telemetry).

## API Endpoints:
- `GET  /api/health` - App startup health check
- `POST /api/payment/create-order` - Creates Razorpay Order ID
- `POST /api/payment/verify` - Verifies Razorpay payment signature
- `GET  /api/ads/config` - Remote custom ad campaigns
- `GET & POST /api/telemetry` - Analytics & active device tracking

## Deployment on Vercel:
1. Import this repository into Vercel.
2. In Project Settings -> Environment Variables, add:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
3. Hit Deploy!

