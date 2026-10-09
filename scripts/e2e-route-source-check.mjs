import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const checks = [
  ['active landing page remains wired', /CinematicLandingPage/.test(app)],
  ['pricing route remains available', /path === '\/pricing'/.test(app)],
  ['business login route remains available', /path === '\/login'/.test(app)],
  ['platform admin login route remains available', /path === '\/platform\/login'/.test(app)],
  ['checkout route remains available', /path === '\/checkout'/.test(app)],
  ['account setup route remains available', /path === '\/setup-account'/.test(app)],
  ['password reset route remains available', /path === '\/reset-password'/.test(app)],
  ['email verification route remains available', /path === '\/verify-email'/.test(app)],
  ['dashboard route map includes leads', /'leads': 'leads'/.test(app)],
  ['dashboard route map includes CRM', /'crm': 'crm'/.test(app)],
  ['dashboard route map includes integrations', /'integrations': 'integrations'/.test(app)],
  ['dashboard route map includes billing', /billing: '\/billing'|billing: \"\/billing\"/.test(app)],
  ['obsolete landing component is not imported', !/from ['"].\/components\/LandingPage['"]/.test(app)],
  ['Design Studio is not exposed as a navigation tab', !/id:\s*['"]design_studio['"]/.test(app)]
];

const failures = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
}

if (failures.length) {
  console.error(`\n${failures.length} route/UI regression check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} route/UI regression checks passed.`);
