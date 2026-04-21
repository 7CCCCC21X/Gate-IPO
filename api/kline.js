const https = require('https');

const UPSTREAM_BASE = 'https://dquery.sintral.io/u-kline/v1/k-line/candles';

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
          'Referer': 'https://dquery.sintral.io/',
          'Origin': 'https://dquery.sintral.io',
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
  const q = req.query || {};
  const address = q.address || 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh';
  const interval = q.interval || '1min';
  const limit = q.limit || '500';
  const platform = q.platform || 'solana';
  const to = q.to || String(Date.now());

  const url =
    `${UPSTREAM_BASE}?address=${encodeURIComponent(address)}` +
    `&interval=${encodeURIComponent(interval)}` +
    `&limit=${encodeURIComponent(limit)}` +
    `&platform=${encodeURIComponent(platform)}` +
    `&to=${encodeURIComponent(to)}`;

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
