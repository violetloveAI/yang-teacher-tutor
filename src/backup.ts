const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type EncryptedBackup = {
  format: 'yang-teacher-tutor-backup';
  version: 1;
  createdAt: string;
  salt: string;
  iv: string;
  ciphertext: string;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array) {
  const source = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 250_000, hash: 'SHA-256' },
    source,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBackup(payload: unknown, password: string): Promise<EncryptedBackup> {
  if (password.length < 6) throw new Error('备份密码至少需要 6 位。');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(payload)));
  return {
    format: 'yang-teacher-tutor-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBackup<T>(backup: EncryptedBackup, password: string): Promise<T> {
  if (backup.format !== 'yang-teacher-tutor-backup' || backup.version !== 1) throw new Error('不支持这个备份文件。');
  try {
    const salt = base64ToBytes(backup.salt);
    const iv = base64ToBytes(backup.iv);
    const key = await deriveKey(password, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(backup.ciphertext));
    return JSON.parse(decoder.decode(plain)) as T;
  } catch {
    throw new Error('备份密码不正确，或文件已损坏。');
  }
}
