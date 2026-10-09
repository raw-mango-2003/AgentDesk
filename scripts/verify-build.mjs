import { execFileSync } from 'node:child_process';

const commands = [
  ['node', ['scripts/e2e-route-source-check.mjs']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'build']]
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  try {
    execFileSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  } catch (error) {
    process.exit(typeof error.status === 'number' ? error.status : 1);
  }
}

console.log('\nRoute/UI regression checks, build, and type-check verification completed successfully.');
