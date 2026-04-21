const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const IPO_BASE = 'https://www.gate.com/apiw/v2/launch/ipos/project-detail';
const KLINE_BASE = 'https://dquery.sintral.io/u-kline/v1/k-line/candles';

function forward(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (r) => {
      let data = '';
      r.on('data', (chunk) => (data += chunk));
      r.on('end', () => resolve({ status: r.statusCode || 502, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('upstream timeout')));
  });
}

const GATE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://www.gate.com/',
  'Origin': 'https://www.gate.com',
};

const KLINE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://dquery.sintral.io/',
  'Origin': 'https://dquery.sintral.io',
};

async function proxy(res, url, headers) {
  try {
    const { status, body } = await forward(url, headers);
    res.writeHead(status || 502, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (e) {
    res.writeHead(502, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: String((e && e.message) || e) }));
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (u.pathname === '/' || u.pathname === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, buf) => {
      if (err) {
        res.writeHead(500);
        res.end('index.html missing next to server.js');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buf);
    });
    return;
  }

  if (u.pathname === '/api/ipo') {
    const projectId = u.searchParams.get('project_id') || '2';
    const subId = u.searchParams.get('sub_website_id') || '0';
    const url = `${IPO_BASE}?sub_website_id=${encodeURIComponent(subId)}&project_id=${encodeURIComponent(projectId)}`;
    return proxy(res, url, GATE_HEADERS);
  }

  if (u.pathname === '/api/kline') {
    const address = u.searchParams.get('address') || 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh';
    const interval = u.searchParams.get('interval') || '1min';
    const limit = u.searchParams.get('limit') || '500';
    const platform = u.searchParams.get('platform') || 'solana';
    const to = u.searchParams.get('to') || String(Date.now());
    const url =
      `${KLINE_BASE}?address=${encodeURIComponent(address)}` +
      `&interval=${encodeURIComponent(interval)}` +
      `&limit=${encodeURIComponent(limit)}` +
      `&platform=${encodeURIComponent(platform)}` +
      `&to=${encodeURIComponent(to)}`;
    return proxy(res, url, KLINE_HEADERS);
  }

  if (u.pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(
    `404 Not Found: ${u.pathname}\n\n` +
      `可用路径：\n` +
      `  GET /\n` +
      `  GET /api/ipo?project_id=2\n` +
      `  GET /api/kline?interval=1min&limit=10\n\n` +
      `请访问 http://localhost:${PORT}/`
  );
});

server.listen(PORT, () => {
  console.log(`Gate SPCX 收益预估: http://localhost:${PORT}/`);
  console.log(`IPO proxy:           http://localhost:${PORT}/api/ipo?project_id=2`);
  console.log(`K-line proxy:        http://localhost:${PORT}/api/kline?interval=1min&limit=10`);
});
