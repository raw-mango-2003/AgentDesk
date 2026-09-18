import { execFileSync } from 'node:child_process';

const commands = [
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

console.log('\nBuild and type-check verification completed successfully.');
