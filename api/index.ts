import { startServer } from '../backend/api-gateway/server';

let app: any;

export default async (req: any, res: any) => {
  try {
    console.log(`[VERCEL_API] Incoming ${req.method} ${req.url}`);
    if (!app) {
      console.log('[VERCEL_API] Initializing server...');
      app = await startServer();
    }
    return app(req, res);
  } catch (error) {
    console.error('[API_ERROR_GLOBAL]', error);
    res.status(500).json({ 
      error: 'SERVER_FAULT', 
      details: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
};
