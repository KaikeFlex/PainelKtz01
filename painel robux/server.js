const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const PORT = Number(process.env.PORT || 8765);
const HOST = '127.0.0.1';
const ROOT = __dirname;
const CACHE_TTL = 5 * 60_000;
const cache = new Map();

// --- CONFIGURAÇÃO DE SENHA ---
// Vá em https://www.base64encode.org/
// Digite: admin:SUASENHA e clique em Encode.
// Substitua o código abaixo pelo que você gerar:
const SENHA_CORRETA = 'Basic YWRtaW46NjAzMTc5MzNraw=='; 

const FILE_CHAVES = path.join(ROOT, 'chaves.txt');
let CHAVES_ATIVAS = new Map();
const SESSAO_KEYS = new Map();

CHAVES_ATIVAS.set('ktz', 9999999999999);
CHAVES_ATIVAS.set('KTZ-Kaploc2', 9999999999999);
CHAVES_ATIVAS.set('KTZ-gsw1', 9999999999999);
CHAVES_ATIVAS.set('KTZ-moreira13', 9999999999999);

async function carregarChavesDoArquivo() {
  try {
    const conteudo = await fs.readFile(FILE_CHAVES, 'utf8');
    const linhas = conteudo.split(/\r?\n/);
    const agora = Date.now();
    for (const linha of linhas) {
      if (!linha.trim()) continue;
      const [key, expStr] = linha.split(':');
      if (key && expStr) {
        const expiracao = Number(expStr);
        if (expiracao > agora) CHAVES_ATIVAS.set(key.trim(), expiracao);
      }
    }
    await salvarChavesNoArquivo();
  } catch { await salvarChavesNoArquivo(); }
}

async function salvarChavesNoArquivo() {
  try {
    const linhas = [];
    for (const [key, expiracao] of CHAVES_ATIVAS.entries()) {
      linhas.push(`${key}:${expiracao}`);
    }
    await fs.writeFile(FILE_CHAVES, linhas.join('\n'), 'utf8');
  } catch (err) { console.error('Erro ao salvar chaves.txt:', err); }
}

setInterval(async () => {
  const agora = Date.now();
  let mudou = false;
  for (const [key, expiracao] of CHAVES_ATIVAS.entries()) {
    if (agora >= expiracao) {
      CHAVES_ATIVAS.delete(key);
      SESSAO_KEYS.delete(key);
      mudou = true;
    }
  }
  if (mudou) await salvarChavesNoArquivo();
}, 10000);

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  // 🔑 PROTEÇÃO DE SENHA AQUI
  if (pathname === '/painel-admin') {
    const auth = req.headers['authorization'];
    if (auth !== SENHA_CORRETA) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Acesso Restrito"' });
      return res.end('Acesso Negado');
    }
    
    // --- SEU PAINEL ORIGINAL ---
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html>... (COLE SEU HTML DO PAINEL AQUI) ...</html>`);
    return;
  }

  // Restante do seu serveStatic original
  const fileName = pathname === '/' || pathname === '/pt/robuxcomprar.html' ? 'robuxcomprar.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT, fileName);
  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': path.extname(filePath) === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}

const server = http.createServer((req, res) => {
  // [Suas rotas de API continuam aqui abaixo...]
  if (req.url.startsWith('/api/')) {
    // ... cole o restante do seu bloco server.createServer aqui
  }
  serveStatic(req, res);
});

carregarChavesDoArquivo().then(() => {
  server.listen(PORT, () => console.log(`Rodando em ${PORT}`));
});
