import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function localPrintersDevPlugin(): Plugin {
  return {
    name: 'printo-local-printers-detector',
    configureServer(server) {
      server.middlewares.use('/__local-printers', async (_req, res) => {
        try {
          const { exec } = await import('node:child_process');
          const { promisify } = await import('node:util');
          const os = await import('node:os');
          const execAsync = promisify(exec);

          const platform = os.platform();
          let printers: any[] = [];

          if (platform === 'win32') {
            const cmd =
              'powershell -NoProfile -Command "Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus,Shared,Default | ConvertTo-Json"';
            const { stdout } = await execAsync(cmd, { timeout: 6000 });
            if (stdout && stdout.trim()) {
              const parsed = JSON.parse(stdout);
              const list = Array.isArray(parsed) ? parsed : [parsed];
              printers = list.map((p: any, idx: number) => ({
                id: `os-win-${idx}-${p.Name}`,
                name: p.Name,
                driver: p.DriverName || 'Windows Driver',
                port: p.PortName || 'Local Port',
                status: Number(p.PrinterStatus) === 8 ? 'offline' : Number(p.PrinterStatus) === 0 ? 'online' : 'ready',
                isDefault: Boolean(p.Default),
                connection: String(p.PortName || '').toUpperCase().includes('USB')
                  ? 'USB Port'
                  : String(p.PortName || '').toUpperCase().includes('IP') ||
                    String(p.PortName || '').toUpperCase().includes('WSD')
                  ? 'Network / Wi-Fi'
                  : 'System Spooler',
                source: 'OS Spooler',
              }));
            }
          } else {
            const { stdout } = await execAsync('lpstat -p -d', { timeout: 5000 }).catch(() => ({
              stdout: '',
            }));
            const lines = stdout.split('\n');
            let defaultPrinter = '';
            for (const line of lines) {
              if (line.startsWith('system default destination:')) {
                defaultPrinter = line.split(':')[1]?.trim() || '';
              } else if (line.startsWith('printer ')) {
                const match = line.match(/^printer\s+(\S+)/i);
                const name = match?.[1];
                if (name) {
                  printers.push({
                    id: `os-cups-${name}`,
                    name,
                    driver: 'CUPS Driver',
                    port: 'CUPS Spooler',
                    status: line.toLowerCase().includes('disabled') ? 'offline' : 'online',
                    isDefault: name === defaultPrinter,
                    connection: 'CUPS System',
                    source: 'OS Spooler',
                  });
                }
              }
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, platform, hostname: os.hostname(), printers }));
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: err?.message || 'Unavailable', printers: [] }));
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
