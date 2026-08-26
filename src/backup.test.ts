import { describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup } from './backup';

describe('encrypted backups', () => {
  it('round-trips structured app data', async () => {
    const input = { version: 1, students: [{ id: 'student-1', name: '演示学生' }], lessons: [] };
    const encrypted = await encryptBackup(input, 'safe-demo-password');
    const restored = await decryptBackup<typeof input>(encrypted, 'safe-demo-password');
    expect(restored).toEqual(input);
    expect(encrypted.ciphertext).not.toContain('演示学生');
  });

  it('rejects the wrong password', async () => {
    const encrypted = await encryptBackup({ version: 1 }, 'correct-password');
    await expect(decryptBackup(encrypted, 'wrong-password')).rejects.toThrow('密码不正确');
  });

  it('requires a backup password of at least six characters', async () => {
    await expect(encryptBackup({ version: 1 }, '12345')).rejects.toThrow('至少需要 6 位');
  });
});
