// Generate a PBKDF2 password hash for ADMIN_PASSWORD_HASH.
// Usage:  npm run hash            (prompts for the password)
//         npm run hash -- secret  (hashes the given argument)
// The output format matches verifyPassword() in src/lib/auth.ts.
import { webcrypto as crypto } from 'node:crypto';
import { createInterface } from 'node:readline';

const ITERATIONS = 100000;

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    key,
    256,
  );
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(bits)}`;
}

const arg = process.argv[2];
if (arg) {
  console.log(await hash(arg));
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter admin password: ', async (pw) => {
  rl.close();
  if (!pw) {
    console.error('No password provided.');
    process.exit(1);
  }
  console.log('\nSet this as ADMIN_PASSWORD_HASH:\n');
  console.log(await hash(pw));
});
