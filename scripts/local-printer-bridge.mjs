#!/usr/bin/env node

/**
 * ==============================================================================
 * PRINTO - LOCAL SYSTEM PRINTER AUTO-DETECTOR & JOB MONITOR BRIDGE
 * ==============================================================================
 * Exposes:
 *   GET  http://127.0.0.1:9191/printers            -> Real-time OS printers + statuses
 *   POST http://127.0.0.1:9191/print               -> Dispatches job (URL/Blob/Pages)
 *   GET  http://127.0.0.1:9191/job-status?id=...   -> Live pagesPrinted & paper/error status
 *   POST http://127.0.0.1:9191/cancel-job          -> Cancels spooler job cleanly
 * ==============================================================================
 */

import http from 'node:http';
import os from 'node:os';
import {
  detectOsPrinters,
  dispatchOsPrintJob,
  getOsPrintJobStatus,
  cancelOsPrintJob,
} from './os-spooler.mjs';

const PORT = 9191;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    const MAX_BYTES = 50 * 1024 * 1024;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BYTES) {
        reject(new Error('Print payload exceeds 50 MB limit'));
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

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (parsedUrl.pathname === '/printers' && req.method === 'GET') {
    try {
      const printers = await detectOsPrinters();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          platform: os.platform(),
          hostname: os.hostname(),
          printers,
        })
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message, printers: [] }));
    }
    return;
  }

  if (parsedUrl.pathname === '/print' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = await dispatchOsPrintJob(body);
      res.writeHead(result.ok ? 200 : 409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, state: 'error', error: err.message }));
    }
    return;
  }

  if (parsedUrl.pathname === '/job-status' && req.method === 'GET') {
    try {
      const id = parsedUrl.searchParams.get('id') || '';
      const status = await getOsPrintJobStatus(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, state: 'error', message: err.message }));
    }
    return;
  }

  if (parsedUrl.pathname === '/cancel-job' && req.method === 'POST') {
    try {
      const { trackingId } = await readJsonBody(req);
      const result = await cancelOsPrintJob(trackingId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🖨️  Printo Local Printer Bridge running on http://127.0.0.1:${PORT}`);
  console.log(`   Exposing system printers & live job tracking from: ${os.hostname()} (${os.platform()})`);
});
