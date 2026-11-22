// backend/globals.d.ts
// Global type declarations for Node.js / Vercel Serverless environment

declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
};

