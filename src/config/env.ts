/**
 * Central environment loader. It must be the FIRST import of every entry point
 * (server, seed) so that all other modules see a fully populated process.env.
 *
 * 1. `.env` is loaded with dotenv (the RS256 key pair lives there, as required).
 * 2. Optionally, JWT_KEYS_FILE points to an env-style file that holds the key pair.
 *    The Docker image uses this to generate the keys once and persist them in a
 *    volume, so that no single-file bind mount of `.env` is needed.
 *    Values that are missing OR empty in the environment are filled from that file.
 */
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

const keysFile = process.env.JWT_KEYS_FILE;
if (keysFile && fs.existsSync(keysFile)) {
  const parsed = dotenv.parse(fs.readFileSync(keysFile));
  for (const name of ['JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY'] as const) {
    if (!process.env[name] && parsed[name]) process.env[name] = parsed[name];
  }
}
