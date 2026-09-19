#!/usr/bin/env node
/**
 * End-to-end smoke test: launches headless Chrome against a running build, lets the boot
 * sequence finish, engages a course (via the ?course= deep link), and watches the transfer
 * complete in real time through the DevTools protocol. No dependencies beyond Node 22+ and a
 * local Chrome.
 *
 *   npm run build && npx vite preview --port 4173 &   (or `npm run dev` on 5173)
 *   node scripts/e2e/smoke-course.mjs --url http://localhost:4173 --target mars
 *
 * Env: CHROME_BIN overrides the Chrome executable path.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1] ?? true] : [])).filter((x) => x.length));
const BASE = args.url ?? 'http://localhost:4173';
const TARGET = args.target ?? 'mars';
const OUT = args.out ?? join(tmpdir(), 'last-light-smoke');
const PORT = 9333;
const CHROME = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--window-size=1280,720', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, 'profile')}`,
  `${BASE}/?course=${encodeURIComponent(TARGET)}`,
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://localhost:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page' && t.url.startsWith(BASE));
      if (page) return page;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('Chrome debug target not found');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); const p = this.pending.get(d.id); if (p) { this.pending.delete(d.id); d.error ? p.reject(new Error(d.error.message)) : p.resolve(d.result); } }; }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  async evaluate(expression) { const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; }
  async screenshot(file) { const r = await this.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(r.data, 'base64')); return file; }
}

const STATE = `(() => { const s = window.__lastLight?.store.getState(); if (!s) return null; return JSON.stringify({
  phase: s.phase, mode: s.flightMode, course: s.course ? { target: s.course.targetId, status: s.course.status, progress: +s.course.progress.toFixed(3), travelDays: +(s.course.plan.travelTimeS / 86400).toFixed(1), warp: Math.round(s.course.effectiveTimeScale) } : null,
  missionDays: +((s.simTime - s.missionStartSimTime) / 86400).toFixed(2), velocityKms: +s.ship.velocityKms.toFixed(3), deltaV: +s.ship.deltaVRemainingKms.toFixed(1), frame: s.ship.frameBodyId,
  helioAU: +(s.ship.helioDistanceKm / 149597870.7).toFixed(4), discoveries: s.discoveryOrder, notices: s.notices.map((n) => n.title) }); })()`;

let failed = false;
try {
  const page = await findTarget();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const cdp = new CDP(ws);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  const errors = [];
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.text + ' ' + (d.params.exceptionDetails.exception?.description ?? '')); });

  let midShot = false;
  let last = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 150_000) {
    await sleep(1500);
    const raw = await cdp.evaluate(STATE);
    if (!raw) continue;
    const s = JSON.parse(raw);
    const line = `${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s  phase=${s.phase} mode=${s.mode} course=${s.course ? `${s.course.target}:${s.course.status}@${s.course.progress}` : '-'} mission=${s.missionDays}d v=${s.velocityKms}km/s Δv=${s.deltaV} frame=${s.frame} r=${s.helioAU}AU disc=${s.discoveries.length}`;
    if (line !== last) console.log(line);
    last = line;
    if (s.course && s.course.status === 'ENGAGED' && s.course.progress > 0.3 && !midShot) { midShot = true; console.log('  screenshot', await cdp.screenshot(join(OUT, 'course-mid.png'))); }
    if (s.course && s.course.status === 'COMPLETE') {
      await sleep(1500);
      console.log('  screenshot', await cdp.screenshot(join(OUT, 'course-end.png')));
      const final = JSON.parse(await cdp.evaluate(STATE));
      console.log('FINAL', JSON.stringify(final));
      const ok = final.mode === 'HOLD' && final.frame === TARGET && final.discoveries.includes(TARGET) && final.deltaV < 240;
      console.log(ok ? 'SMOKE PASS' : 'SMOKE FAIL: unexpected final state');
      failed = !ok;
      break;
    }
  }
  if (errors.length) { console.log('PAGE EXCEPTIONS:'); errors.forEach((e) => console.log('  ' + e)); failed = true; }
  if (!last?.includes('COMPLETE') && !failed) { console.log('SMOKE FAIL: course did not complete in time'); failed = true; }
  ws.close();
} catch (e) {
  console.error('SMOKE ERROR', e);
  failed = true;
} finally {
  chrome.kill('SIGKILL');
}
process.exit(failed ? 1 : 0);
