import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hashAdminPassword } from '../functions/_lib/admin-auth.js';

const terminal = createInterface({ input: stdin, output: stdout });
const password = await terminal.question('请输入共享管理密码（输入会显示在当前终端）：');
terminal.close();
if (password.length < 12) throw new Error('管理密码至少需要 12 个字符');
stdout.write(`${await hashAdminPassword(password)}\n`);
