/**
 * Generates an RS256 (RSA 2048) key pair and stores it as JWT_PRIVATE_KEY / JWT_PUBLIC_KEY
 * (PEM with escaped newlines) in an env-style file.
 *
 *   node scripts/generate-keys.js                 -> writes into .env (created from .env.example if missing)
 *   node scripts/generate-keys.js --if-missing    -> does nothing when a key pair already exists
 *   node scripts/generate-keys.js --out <file>    -> writes into another env file (used by Docker)
 */
const fs = require('node:fs');
const path = require('node:path');
const { generateKeyPairSync } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const onlyIfMissing = args.includes('--if-missing');
const outIndex = args.indexOf('--out');
const customOut = outIndex >= 0 ? args[outIndex + 1] : undefined;
if (outIndex >= 0 && !customOut) {
  console.error('--out requires a file path.');
  process.exit(1);
}
const outPath = customOut ? path.resolve(customOut) : path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

function readEnvValue(content, name) {
  const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^"|"$/g, '') : '';
}

function setEnvValue(content, name, value) {
  const line = `${name}="${value.replace(/\r?\n/g, '\\n')}"`;
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  return pattern.test(content) ? content.replace(pattern, () => line) : `${content.trimEnd()}\n${line}\n`;
}

let content = '';
if (fs.existsSync(outPath)) content = fs.readFileSync(outPath, 'utf8');
else if (!customOut && fs.existsSync(examplePath)) content = fs.readFileSync(examplePath, 'utf8'); // new .env starts from the template

const hasPair = (process.env.JWT_PRIVATE_KEY || readEnvValue(content, 'JWT_PRIVATE_KEY'))
  && (process.env.JWT_PUBLIC_KEY || readEnvValue(content, 'JWT_PUBLIC_KEY'));
if (onlyIfMissing && hasPair) {
  console.log('RS256 keys already available; keeping the existing key pair.');
  process.exit(0);
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

content = setEnvValue(content, 'JWT_PRIVATE_KEY', privateKey);
content = setEnvValue(content, 'JWT_PUBLIC_KEY', publicKey);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content, { mode: 0o600 });
console.log(`Generated an RS256 key pair and stored it in ${outPath}.`);
console.log('Keep this file private; it must never be committed.');
