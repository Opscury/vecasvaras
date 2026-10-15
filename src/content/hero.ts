/**
 * Who the player is: chosen once, at the start of a run.
 *
 * The names are ones the 19th-century Zemgale parish books are full of. The
 * one Ilze or Krišs would carry is left out, so nobody courts their namesake.
 */

import { L } from '../core/i18n';
import type { Gender } from '../core/state';

export const hero = {
  heading: L('Kas tu esi?', 'Who are you?'),
  lead: L(
    'Ciemā tevi pazīst kopš šūpuļa.',
    'The village has known you since the cradle.',
  ),
  man: L('Puisis', 'A young man'),
  woman: L('Meita', 'A young woman'),
  name: L('Vārds', 'Name'),
  another: L('Cits vārds', 'Another name'),
  begin: L('Sākt gadu', 'Begin the year'),
  /** Said under the field when it is left empty. */
  needName: L('Kā tevi sauc?', 'What are you called?'),
};

export const NAMES: Record<Gender, readonly string[]> = {
  m: ['Jānis', 'Pēteris', 'Andžs', 'Mārtiņš', 'Ansis', 'Miķelis', 'Jēkabs', 'Indriķis', 'Mikus', 'Juris'],
  f: ['Grieta', 'Līze', 'Trīne', 'Madlēna', 'Katrīne', 'Lavīze', 'Marija', 'Dārta', 'Ieva', 'Līga'],
};

export const pickName = (g: Gender, not = ''): string => {
  const pool = NAMES[g].filter((n) => n !== not);
  return pool[Math.floor(Math.random() * pool.length)];
};
