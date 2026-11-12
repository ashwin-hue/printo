import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'node:os';
// @ts-ignore Shared runtime JS helper in ../scripts/os-spooler.mjs
import {
  detectOsPrinters,
  dispatchOsPrintJob,
  getOsPrintJobStatus,
  cancelOsPrintJob,
} from '../scripts/os-spooler.mjs';

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    const MAX_BYTES = 50 * 1024 * 1024;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BYTES) {
        reject(new Error('Payload exceeds 50 MB limit'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function localPrintersDevPlugin(): Plugin {
  return {
    name: 'printo-local-printers-detector',
    configureServer(server) {
      server.middlewares.use('/__local-printers', async (_req, res) => {
        try {
          const printers = await detectOsPrinters();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, platform: os.platform(), hostname: os.hostname(), printers }));
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: err?.message || 'Unavailable', printers: [] }));
        }
      });

      server.middlewares.use('/__local-print-job', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
          return;
        }
        try {
          const body = await readJsonBody(req);
          const result = await dispatchOsPrintJob(body);
          res.statusCode = result.ok ? 200 : 409;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, state: 'error', error: err?.message || 'Print dispatch failed' }));
        }
      });

      server.middlewares.use('/__local-job-status', async (req, res) => {
        try {
          const parsedUrl = new URL(req.url || '/', 'http://localhost');
          const id = parsedUrl.searchParams.get('id') || '';
          const status = await getOsPrintJobStatus(id);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(status));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, state: 'error', message: err?.message || 'Status check failed' }));
        }
      });

      server.middlewares.use('/__local-cancel-job', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
          return;
        }
        try {
          const { trackingId } = await readJsonBody(req);
          const result = await cancelOsPrintJob(trackingId);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: err?.message || 'Cancel failed' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localPrintersDevPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
    host: true,
  },
});
