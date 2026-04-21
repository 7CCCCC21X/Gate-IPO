const https = require('https');

const UPSTREAM_BASE = 'https://www.gate.com/apiw/v2/launch/ipos/project-detail';

function fetchUpstream(url) {
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
      (r) => {
        let body = '';
        r.on('data', (c) => (body += c));
        r.on('end', () => resolve({ status: r.statusCode || 502, body }));
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('upstream timeout')));
  });
}

module.exports = async (req, res) => {
  const projectId = (req.query && req.query.project_id) || '2';
  const subWebsiteId = (req.query && req.query.sub_website_id) || '0';
  const url =
    `${UPSTREAM_BASE}?sub_website_id=${encodeURIComponent(subWebsiteId)}` +
    `&project_id=${encodeURIComponent(projectId)}`;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { status, body } = await fetchUpstream(url);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(status).send(body);
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
};
