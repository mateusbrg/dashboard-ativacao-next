import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';

process.env.TZ = 'America/Sao_Paulo';

export function createClient(connectionString) {
  if (!connectionString) throw new Error('Defina MONGODB_URI no arquivo .env.');
  return new MongoClient(connectionString, { serverSelectionTimeoutMS: 5000 });
}

const client = createClient(process.env.MONGODB_URI);
if (!process.env.MONGODB_DB || !process.env.MONGODB_COLLECTION) {
  throw new Error('Defina MONGODB_DB e MONGODB_COLLECTION no arquivo .env.');
}
const comments = client
  .db(process.env.MONGODB_DB)
  .collection(process.env.MONGODB_COLLECTION);
let goal = Number(process.env.GOAL || 100);
if (!Number.isSafeInteger(goal) || goal < 1)
  throw new Error('GOAL deve ser um inteiro positivo.');
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/fonts/exo-2-latin-wght-normal.woff2': [
    'fonts/exo-2-latin-wght-normal.woff2',
    'font/woff2',
  ],
  '/camisa-next.jpg': ['camisa-next.jpg', 'image/jpg'],
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
  );
  if (req.method !== 'GET') {
    res.writeHead(405).end();
    return;
  }

  if (req.url === '/api/comments') {
    let goal = Number(process.env.GOAL || 100);
    if (!Number.isSafeInteger(goal) || goal < 1) goal = 100;
    res.setHeader('Content-Type', 'application/json');
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const [result] = await comments
        .aggregate(
          [
            {
              $match: {
                active: true,
                comment: { $type: 'string', $regex: '\\S' },
                createdAt: { $gte: start, $lt: end },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                latestCommentAt: { $max: '$createdAt' },
              },
            },
          ],
          { maxTimeMS: 5000 },
        )
        .toArray();
      res.end(
        JSON.stringify({
          day: start.toISOString(),
          total: result?.total ?? 0,
          latestCommentAt: result?.latestCommentAt ?? null,
          goal,
        }),
      );
    } catch {
      res
        .writeHead(503)
        .end(
          JSON.stringify({
            error: 'Não foi possível consultar os comentários.',
          }),
        );
    }
    return;
  }

  const file = files[req.url];
  if (!file) {
    res.writeHead(404).end();
    return;
  }
  try {
    const content = await readFile(
      new URL(`./public/${file[0]}`, import.meta.url),
    );
    res.setHeader('Content-Type', file[1]);
    res.end(content);
  } catch {
    res.writeHead(500).end('Não foi possível carregar o painel.');
  }
});

server.listen(
  Number(process.env.PORT || 3000),
  process.env.HOST || '127.0.0.1',
  () => {
    console.log(`Painel: http://localhost:${server.address().port}`);
  },
);
