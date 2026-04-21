const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const UPSTREAM_BASE = 'https://www.gate.com/apiw/v2/launch/ipos/project-detail';

function fetchUpstream(projectId) {
  const url = `${UPSTREAM_BASE}?sub_website_id=0&project_id=${encodeURIComponent(projectId)}`;
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': 'https://www.gate.com/',
          'Origin': 'https://www.gate.com',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('upstream timeout')));
  });
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
    try {
      const { status, body } = await fetchUpstream(projectId);
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
    return;
  }

  if (u.pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(
    `404 Not Found: ${u.pathname}\n\n` +
      `可用路径：\n  GET /\n  GET /api/ipo?project_id=2\n\n` +
      `请访问 http://localhost:${PORT}/`
  );
});

server.listen(PORT, () => {
  console.log(`Gate IPO viewer: http://localhost:${PORT}/`);
  console.log(`API proxy:       http://localhost:${PORT}/api/ipo?project_id=2`);
});
