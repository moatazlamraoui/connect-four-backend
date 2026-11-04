const fs = require('node:fs');
const path = require('node:path');
const { generateKeyPairSync } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');
const onlyIfMissing = process.argv.includes('--if-missing');

function readEnvValue(content, name) {
  const match = content.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^"|"$/g, '');
}

function setEnvValue(content, name, value) {
  const escaped = value.replace(/\r?\n/g, '\\n');
  const line = `${name}="${escaped}"`;
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  return pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
}

let envContent = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf8')
  : (fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '');

const currentPrivateKey = process.env.JWT_PRIVATE_KEY || readEnvValue(envContent, 'JWT_PRIVATE_KEY');
const currentPublicKey = process.env.JWT_PUBLIC_KEY || readEnvValue(envContent, 'JWT_PUBLIC_KEY');
if (onlyIfMissing && currentPrivateKey && currentPublicKey) {
  console.log('RS256 keys already exist in environment/.env; keeping the existing key pair.');
  process.exit(0);
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

envContent = setEnvValue(envContent, 'JWT_PRIVATE_KEY', privateKey);
envContent = setEnvValue(envContent, 'JWT_PUBLIC_KEY', publicKey);
fs.writeFileSync(envPath, envContent, { mode: 0o600 });
console.log('Generated an RS256 key pair and stored JWT_PRIVATE_KEY/JWT_PUBLIC_KEY in .env.');
console.log('Keep .env private; it is ignored by Git.');
