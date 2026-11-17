import { exec, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// In-memory registry of recently dispatched OS print jobs for progress & error tracking
const trackedJobs = new Map();

function decodeWindowsPrinterFlags(statusVal, statusStr = '') {
  const num = Number(statusVal) || 0;
  const text = String(statusStr || '').toLowerCase();

  const has = (flag, token) => (num & flag) !== 0 || text.includes(token);

  if (has(16, 'paperout')) return { state: 'paper_out', label: 'Out of Paper' };
  if (has(8, 'paperjam')) return { state: 'paper_jam', label: 'Paper Jam' };
  if (has(64, 'paperproblem')) return { state: 'paper_out', label: 'Paper Feed Error' };
  if (has(128, 'offline')) return { state: 'offline', label: 'Offline' };
  if (has(4194304, 'dooropen')) return { state: 'error', label: 'Cover / Door Open' };
  if (has(262144, 'notoner')) return { state: 'error', label: 'Out of Toner / Ink' };
  if (has(1, 'paused')) return { state: 'paused', label: 'Paused' };
  if (has(2, 'error') || has(1048576, 'userintervention')) {
    return { state: 'attention', label: 'Needs Attention' };
  }
  if (has(1024, 'printing')) return { state: 'printing', label: 'Printing' };
  if (has(512, 'busy') || has(16384, 'processing')) return { state: 'printing', label: 'Busy' };
  return { state: 'online', label: 'Online' };
}

function decodeWindowsJobFlags(statusVal, statusStr = '') {
  const num = Number(statusVal) || 0;
  const text = String(statusStr || '').toLowerCase();
  const has = (flag, token) => (num & flag) !== 0 || text.includes(token);

  if (has(64, 'paperout')) return 'paper_out';
  if (has(32, 'offline')) return 'offline';
  if (has(256, 'deleted') || has(4, 'deleting')) return 'cancelled';
  if (has(2, 'error') || has(1024, 'userintervention') || has(512, 'blocked')) return 'error';
  if (has(1, 'paused')) return 'paused';
  if (has(4096, 'completed') || has(128, 'printed')) return 'completed';
  if (has(16, 'printing')) return 'printing';
  if (has(8, 'spooling')) return 'spooling';
  return 'spooling';
}

export async function detectOsPrinters() {
  const platform = os.platform();

  if (platform === 'win32') {
    const ps = [
      'Get-Printer | Select-Object Name,DriverName,PortName,@{N="StatusNum";E={[int]$_.PrinterStatus}},@{N="StatusText";E={[string]$_.PrinterStatus}},Default | ConvertTo-Json -Compress',
    ].join('; ');
    const { stdout } = await execAsync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, {
      timeout: 7000,
    });
    if (!stdout || !stdout.trim()) return [];
    const parsed = JSON.parse(stdout);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    return list.map((p, idx) => {
      const decoded = decodeWindowsPrinterFlags(p.StatusNum, p.StatusText);
      return {
        id: `os-win-${idx}-${p.Name}`,
        name: p.Name,
        driver: p.DriverName || 'Windows Print Driver',
        port: p.PortName || 'Local / USB',
        status: decoded.state,
        statusLabel: decoded.label,
        isDefault: Boolean(p.Default),
        connection: String(p.PortName || '').toUpperCase().includes('USB')
          ? 'USB Port'
          : String(p.PortName || '').toUpperCase().includes('IP') ||
            String(p.PortName || '').toUpperCase().includes('WSD')
          ? 'Network / Wi-Fi'
          : 'System Spooler',
        source: 'OS Spooler',
      };
    });
  }

  try {
    const { stdout } = await execAsync('lpstat -p -d', { timeout: 5000 });
    const lines = stdout.split('\n');
    let defaultPrinter = '';
    const printers = [];

    for (const line of lines) {
      if (line.startsWith('system default destination:')) {
        defaultPrinter = line.split(':')[1]?.trim() || '';
      } else if (line.startsWith('printer ')) {
        const match = line.match(/^printer\s+(\S+)/i);
        const name = match?.[1];
        const lower = line.toLowerCase();
        const status = lower.includes('paper')
          ? 'paper_out'
          : lower.includes('disabled') || lower.includes('offline')
          ? 'offline'
          : lower.includes('paused')
          ? 'paused'
          : 'online';
        if (name) {
          printers.push({
            id: `os-cups-${name}`,
            name,
            driver: 'CUPS System Driver',
            port: 'CUPS Local',
            status,
            statusLabel: status === 'paper_out' ? 'Out of Paper' : status,
            isDefault: name === defaultPrinter,
            connection: 'CUPS Spooler',
            source: 'OS Spooler',
          });
        }
      }
    }
    return printers;
  } catch {
    return [];
  }
}

async function queryWindowsPrinterAndJobs(printerName) {
  const safeName = String(printerName || '').replace(/'/g, "''");
  const script = [
    `$p = Get-Printer -Name '${safeName}' -ErrorAction Stop | Select-Object Name,@{N='StatusNum';E={[int]$_.PrinterStatus}},@{N='StatusText';E={[string]$_.PrinterStatus}};`,
    `$j = @(Get-PrintJob -PrinterName '${safeName}' -ErrorAction SilentlyContinue | Select-Object ID,DocumentName,@{N='StatusNum';E={[int]$_.JobStatus}},@{N='StatusText';E={[string]$_.JobStatus}},PagesPrinted,TotalPages);`,
    `[PSCustomObject]@{ printer = $p; jobs = $j } | ConvertTo-Json -Depth 4 -Compress`,
  ].join(' ');
  const { stdout } = await execAsync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
    timeout: 6000,
  });
  return JSON.parse(stdout);
}

function cleanupJobArtifacts(job) {
  if (!job || job.cleaned) return;
  job.cleaned = true;
  for (const filePath of job.tempFiles || []) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Best-effort cleanup
    }
  }
  if (job.tempDir && fs.existsSync(job.tempDir)) {
    try {
      fs.rmSync(job.tempDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}

export async function dispatchOsPrintJob(payload) {
  const {
    printerName,
    fileUrl,
    fileBase64,
    pagesDataUrls,
    fileName = 'document.pdf',
    copies = 1,
    colorMode = 'Color',
    sides = 'Single',
    orientation = 'Portrait',
  } = payload || {};

  const printers = await detectOsPrinters();
  const targetPrinter =
    (printerName ? printers.find((p) => p.name === printerName) : null) ||
    printers.find((p) => p.isDefault) ||
    printers[0];

  if (!targetPrinter) {
    return { ok: false, state: 'error', error: 'No OS printer found on this machine.' };
  }

  // Block immediate dispatch if printer hardware is already in an error state
  if (targetPrinter.status === 'paper_out') {
    return {
      ok: false,
      state: 'paper_out',
      error: `${targetPrinter.name} is out of paper. Load paper first; print job was NOT deleted.`,
    };
  }
  if (targetPrinter.status === 'paper_jam') {
    return {
      ok: false,
      state: 'paper_jam',
      error: `${targetPrinter.name} has a paper jam. Clear jam first; print job was NOT deleted.`,
    };
  }
  if (targetPrinter.status === 'offline') {
    return {
      ok: false,
      state: 'offline',
      error: `${targetPrinter.name} is offline. Turn it on or reconnect USB/Wi-Fi; print job was NOT deleted.`,
    };
  }
  if (targetPrinter.status === 'paused') {
    return {
      ok: false,
      state: 'paused',
      error: `${targetPrinter.name} is paused in system print queue.`,
    };
  }

  const jobTag = `Printo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const trackingId = jobTag;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'printo-job-'));
  const tempFiles = [];
  const platform = os.platform();

  if (platform === 'win32' && Array.isArray(pagesDataUrls) && pagesDataUrls.length > 0) {
    // Write rendered page PNGs + PrintDocument PowerShell manifest (works without Adobe Reader)
    const imagePaths = [];
    pagesDataUrls.forEach((dataUrl, idx) => {
      const base64Data = String(dataUrl).replace(/^data:image\/\w+;base64,/, '');
      const imgPath = path.join(tempDir, `page-${String(idx + 1).padStart(3, '0')}.png`);
      fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
      imagePaths.push(imgPath);
      tempFiles.push(imgPath);
    });

    const configPath = path.join(tempDir, 'job-config.json');
    const psScriptPath = path.join(tempDir, 'print-runner.ps1');
    tempFiles.push(configPath, psScriptPath);

    fs.writeFileSync(
      configPath,
      JSON.stringify({
        printerName: targetPrinter.name,
        documentName: `${jobTag} - ${String(fileName).slice(0, 48)}`,
        copies: Math.max(1, Number(copies) || 1),
        color: String(colorMode).toLowerCase() !== 'b&w',
        duplex: String(sides).toLowerCase().includes('double') ? 'Vertical' : 'Simplex',
        landscape: String(orientation).toLowerCase() === 'landscape',
        imagePaths,
      })
    );

    const psBody = `
Add-Type -AssemblyName System.Drawing
$cfg = Get-Content -Raw -Path '${configPath.replace(/'/g, "''")}' | ConvertFrom-Json
$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = $cfg.printerName
$doc.DocumentName = $cfg.documentName
$doc.PrinterSettings.Copies = [int]$cfg.copies
$doc.DefaultPageSettings.Color = [bool]$cfg.color
$doc.DefaultPageSettings.Landscape = [bool]$cfg.landscape
if ($cfg.duplex -eq 'Vertical') {
  $doc.PrinterSettings.Duplex = [System.Drawing.Printing.Duplex]::Vertical
} else {
  $doc.PrinterSettings.Duplex = [System.Drawing.Printing.Duplex]::Simplex
}
$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController
$script:idx = 0
$doc.add_PrintPage({
  param($sender, $ev)
  $img = [System.Drawing.Image]::FromFile($cfg.imagePaths[$script:idx])
  try {
    $bounds = $ev.MarginBounds
    $ratioX = $bounds.Width / $img.Width
    $ratioY = $bounds.Height / $img.Height
    $ratio = [Math]::Min($ratioX, $ratioY)
    $drawW = [int]($img.Width * $ratio)
    $drawH = [int]($img.Height * $ratio)
    $drawX = [int]($bounds.Left + ($bounds.Width - $drawW) / 2)
    $drawY = [int]($bounds.Top + ($bounds.Height - $drawH) / 2)
    $ev.Graphics.DrawImage($img, $drawX, $drawY, $drawW, $drawH)
  } finally {
    $img.Dispose()
  }
  $script:idx++
  $ev.HasMorePages = ($script:idx -lt $cfg.imagePaths.Count)
})
$doc.Print()
`;
    fs.writeFileSync(psScriptPath, psBody, 'utf8');

    const jobRecord = {
      trackingId,
      jobTag,
      platform,
      printerName: targetPrinter.name,
      expectedPages: pagesDataUrls.length * Math.max(1, Number(copies) || 1),
      tempDir,
      tempFiles,
      startedAt: Date.now(),
      processDone: false,
      processError: null,
      seenInSpooler: false,
      lastState: 'spooling',
      lastPagesPrinted: 0,
      lastTotalPages: pagesDataUrls.length,
      spoolJobId: null,
      cancelledByUser: false,
    };
    trackedJobs.set(trackingId, jobRecord);

    const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScriptPath], {
      windowsHide: true,
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('exit', (code) => {
      jobRecord.processDone = true;
      if (code !== 0 && !jobRecord.cancelledByUser) {
        jobRecord.processError = stderr.trim() || `Printer process exited with code ${code}`;
      }
      // Delay temp cleanup slightly so spooler finishes reading all bytes
      setTimeout(() => cleanupJobArtifacts(jobRecord), 25_000);
    });

    return {
      ok: true,
      trackingId,
      printerName: targetPrinter.name,
      state: 'spooling',
      totalPages: pagesDataUrls.length,
      message: `Sent to ${targetPrinter.name}. Monitoring print progress...`,
    };
  }

  // Fallback raw file spooling (CUPS lp or Windows shell print)
  let rawBuffer;
  if (fileBase64) {
    const cleanB64 = String(fileBase64).replace(/^data:[^;]+;base64,/, '');
    rawBuffer = Buffer.from(cleanB64, 'base64');
  } else if (fileUrl) {
    const resp = await fetch(fileUrl);
    if (!resp.ok) throw new Error(`Failed to fetch file (${resp.status})`);
    rawBuffer = Buffer.from(await resp.arrayBuffer());
  } else {
    cleanupJobArtifacts({ tempDir, tempFiles });
    throw new Error('No document payload or URL provided');
  }

  const ext = path.extname(fileName) || '.pdf';
  const tmpFile = path.join(tempDir, `${jobTag}${ext}`);
  tempFiles.push(tmpFile);
  fs.writeFileSync(tmpFile, rawBuffer);

  const jobRecord = {
    trackingId,
    jobTag,
    platform,
    printerName: targetPrinter.name,
    expectedPages: 1,
    tempDir,
    tempFiles,
    startedAt: Date.now(),
    processDone: false,
    processError: null,
    seenInSpooler: false,
    lastState: 'spooling',
    lastPagesPrinted: 0,
    lastTotalPages: 1,
    spoolJobId: null,
    cancelledByUser: false,
  };
  trackedJobs.set(trackingId, jobRecord);

  if (platform === 'win32') {
    const safePrinter = targetPrinter.name.replace(/'/g, "''");
    const cmd = `powershell -NoProfile -Command "Start-Process -FilePath '${tmpFile.replace(/'/g, "''")}' -Verb PrintTo -ArgumentList '\\"${safePrinter}\\"' -WindowStyle Hidden"`;
    execAsync(cmd, { timeout: 15_000 })
      .then(() => {
        jobRecord.processDone = true;
      })
      .catch((err) => {
        jobRecord.processDone = true;
        jobRecord.processError = err?.message || 'OS print command failed';
      });
  } else {
    const duplexOpt = String(sides).toLowerCase().includes('double') ? '-o sides=two-sided-long-edge' : '-o sides=one-sided';
    const cmd = `lp -d "${targetPrinter.name}" -n ${Math.max(1, Number(copies) || 1)} ${duplexOpt} -t "${jobTag}" "${tmpFile}"`;
    const { stdout } = await execAsync(cmd, { timeout: 12_000 });
    const idMatch = stdout.match(/request id is (\S+)/i);
    jobRecord.spoolJobId = idMatch?.[1] || null;
    jobRecord.seenInSpooler = true;
    jobRecord.processDone = true;
  }

  return {
    ok: true,
    trackingId,
    printerName: targetPrinter.name,
    state: 'spooling',
    totalPages: jobRecord.lastTotalPages,
    message: `Queued on ${targetPrinter.name}. Monitoring print progress...`,
  };
}

export async function getOsPrintJobStatus(trackingId) {
  const job = trackedJobs.get(trackingId);
  if (!job) {
    return { ok: false, state: 'error', message: 'Tracked print job session expired.' };
  }

  if (job.cancelledByUser) {
    cleanupJobArtifacts(job);
    return {
      ok: true,
      state: 'cancelled',
      printerName: job.printerName,
      pagesPrinted: job.lastPagesPrinted,
      totalPages: job.lastTotalPages,
      message: 'Print job was cancelled. Order kept safely in queue.',
    };
  }

  if (job.processError) {
    cleanupJobArtifacts(job);
    return {
      ok: false,
      state: 'error',
      printerName: job.printerName,
      pagesPrinted: job.lastPagesPrinted,
      totalPages: job.lastTotalPages,
      message: job.processError,
    };
  }

  if (job.platform === 'win32') {
    try {
      const snap = await queryWindowsPrinterAndJobs(job.printerName);
      const pStatus = decodeWindowsPrinterFlags(snap?.printer?.StatusNum, snap?.printer?.StatusText);
      const jobs = Array.isArray(snap?.jobs) ? snap.jobs : [];
      const activeJob =
        jobs.find((j) => String(j.DocumentName || '').includes(job.jobTag)) ||
        (job.spoolJobId ? jobs.find((j) => j.ID === job.spoolJobId) : null);

      if (activeJob) {
        job.seenInSpooler = true;
        job.spoolJobId = activeJob.ID ?? job.spoolJobId;
        job.lastPagesPrinted = Number(activeJob.PagesPrinted) || job.lastPagesPrinted;
        job.lastTotalPages = Math.max(job.lastTotalPages, Number(activeJob.TotalPages) || 0);

        const jobState = decodeWindowsJobFlags(activeJob.StatusNum, activeJob.StatusText);
        job.lastState = jobState;

        // Hardware error flags on either printer or job immediately pause completion & alert operator
        if (jobState === 'paper_out' || pStatus.state === 'paper_out') {
          return {
            ok: true,
            state: 'paper_out',
            printerName: job.printerName,
            pagesPrinted: job.lastPagesPrinted,
            totalPages: job.lastTotalPages,
            message: `${job.printerName} ran out of paper! Add paper to continue — job is NOT deleted.`,
          };
        }
        if (pStatus.state === 'paper_jam') {
          return {
            ok: true,
            state: 'paper_jam',
            printerName: job.printerName,
            pagesPrinted: job.lastPagesPrinted,
            totalPages: job.lastTotalPages,
            message: `Paper jam on ${job.printerName}! Clear jam to resume — job is NOT deleted.`,
          };
        }
        if (jobState === 'offline' || pStatus.state === 'offline') {
          return {
            ok: true,
            state: 'offline',
            printerName: job.printerName,
            pagesPrinted: job.lastPagesPrinted,
            totalPages: job.lastTotalPages,
            message: `${job.printerName} went offline mid-job. Check connection — job is NOT deleted.`,
          };
        }
        if (jobState === 'cancelled') {
          job.cancelledByUser = true;
          cleanupJobArtifacts(job);
          return {
            ok: true,
            state: 'cancelled',
            printerName: job.printerName,
            pagesPrinted: job.lastPagesPrinted,
            totalPages: job.lastTotalPages,
            message: 'Print job cancelled in Windows Print Queue. Order kept in queue.',
          };
        }
        if (jobState === 'paused' || pStatus.state === 'paused') {
          return {
            ok: true,
            state: 'paused',
            printerName: job.printerName,
            pagesPrinted: job.lastPagesPrinted,
            totalPages: job.lastTotalPages,
            message: `${job.printerName} is paused. Resume printer in Windows to finish.`,
          };
        }
        if (jobState === 'error' || pStatus.state === 'error' || pStatus.state === 'attention') {
          return {
            ok: true,
            state: 'error',
            printerName: job.printerName,
            pagesPrinted: job.lastPagesPrinted,
            totalPages: job.lastTotalPages,
            message: `${pStatus.label} on ${job.printerName}. Check printer before proceeding.`,
          };
        }
        if (jobState === 'completed') {
          cleanupJobArtifacts(job);
          return {
            ok: true,
            state: 'completed',
            printerName: job.printerName,
            pagesPrinted: Math.max(job.lastPagesPrinted, job.lastTotalPages),
            totalPages: job.lastTotalPages,
            message: `Printed all pages on ${job.printerName}.`,
          };
        }

        return {
          ok: true,
          state: jobState === 'printing' ? 'printing' : 'spooling',
          printerName: job.printerName,
          pagesPrinted: job.lastPagesPrinted,
          totalPages: job.lastTotalPages,
          message:
            jobState === 'printing'
              ? `Printing on ${job.printerName} (${job.lastPagesPrinted}/${job.lastTotalPages} pages)...`
              : `Spooling to ${job.printerName}...`,
        };
      }

      // Job is no longer in Windows Get-PrintJob list: verify printer wasn't halted by paper/offline error
      if (pStatus.state === 'paper_out' || pStatus.state === 'paper_jam' || pStatus.state === 'offline' || pStatus.state === 'error') {
        return {
          ok: true,
          state: pStatus.state,
          printerName: job.printerName,
          pagesPrinted: job.lastPagesPrinted,
          totalPages: job.lastTotalPages,
          message: `${pStatus.label} reported on ${job.printerName}. Job kept in queue.`,
        };
      }

      // If PrintDocument process already completed & spooler flushed without error, printing finished
      const elapsed = Date.now() - job.startedAt;
      if ((job.seenInSpooler && job.processDone) || (job.processDone && elapsed > 2500)) {
        if (job.lastState === 'cancelled') {
          return {
            ok: true,
            state: 'cancelled',
            printerName: job.printerName,
            pagesPrinted: job.lastPagesPrinted,
            totalPages: job.lastTotalPages,
            message: 'Print job was cancelled before completion.',
          };
        }
        cleanupJobArtifacts(job);
        return {
          ok: true,
          state: 'completed',
          printerName: job.printerName,
          pagesPrinted: job.lastTotalPages,
          totalPages: job.lastTotalPages,
          message: `Printing finished on ${job.printerName}.`,
        };
      }

      return {
        ok: true,
        state: 'spooling',
        printerName: job.printerName,
        pagesPrinted: job.lastPagesPrinted,
        totalPages: job.lastTotalPages,
        message: `Sending job to ${job.printerName}...`,
      };
    } catch (err) {
      return {
        ok: false,
        state: 'error',
        printerName: job.printerName,
        message: err?.message || 'Unable to query Windows Print Spooler.',
      };
    }
  }

  // CUPS (macOS / Linux) status check
  try {
    const printers = await detectOsPrinters();
    const current = printers.find((p) => p.name === job.printerName);
    if (current && (current.status === 'paper_out' || current.status === 'offline' || current.status === 'paused')) {
      return {
        ok: true,
        state: current.status,
        printerName: job.printerName,
        pagesPrinted: job.lastPagesPrinted,
        totalPages: job.lastTotalPages,
        message: `${job.printerName}: ${current.statusLabel || current.status}. Job kept in queue.`,
      };
    }
    const { stdout } = await execAsync('lpstat -W not-completed -o', { timeout: 4000 }).catch(() => ({ stdout: '' }));
    const stillActive = job.spoolJobId ? stdout.includes(job.spoolJobId) : false;
    if (stillActive) {
      return {
        ok: true,
        state: 'printing',
        printerName: job.printerName,
        pagesPrinted: job.lastPagesPrinted,
        totalPages: job.lastTotalPages,
        message: `Printing on ${job.printerName}...`,
      };
    }
    cleanupJobArtifacts(job);
    return {
      ok: true,
      state: 'completed',
      printerName: job.printerName,
      pagesPrinted: job.lastTotalPages,
      totalPages: job.lastTotalPages,
      message: `Completed printing on ${job.printerName}.`,
    };
  } catch (err) {
    return { ok: false, state: 'error', message: err?.message || 'Unable to check CUPS job status' };
  }
}

export async function cancelOsPrintJob(trackingId) {
  const job = trackedJobs.get(trackingId);
  if (!job) return { ok: true };
  job.cancelledByUser = true;

  try {
    if (job.platform === 'win32' && job.spoolJobId) {
      const safeName = job.printerName.replace(/'/g, "''");
      await execAsync(
        `powershell -NoProfile -Command "Remove-PrintJob -PrinterName '${safeName}' -ID ${Number(job.spoolJobId)} -ErrorAction SilentlyContinue"`,
        { timeout: 5000 }
      ).catch(() => {});
    } else if (job.spoolJobId) {
      await execAsync(`cancel "${job.spoolJobId}"`, { timeout: 5000 }).catch(() => {});
    }
  } finally {
    cleanupJobArtifacts(job);
  }
  return { ok: true, state: 'cancelled' };
}

