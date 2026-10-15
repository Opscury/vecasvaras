/**
 * The whole run at real speed, from the title button, for `PERF=1`: every
 * scene change and every long frame is logged with a timestamp.
 *
 *   npx vite build; $env:PERF=1; node tools/shot.mjs perf
 */
import run from './run.mjs';

export default [
  { wait: 2500 },
  () => __h.press('Title', 'Sākt', 'Begin', 'Start'),
  { wait: 2500 },
  ...run.slice(2),
];
