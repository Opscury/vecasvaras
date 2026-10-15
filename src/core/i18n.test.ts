import { describe, expect, it } from 'vitest';
import { personalise, vocative } from './i18n';

describe('vocative', () => {
  it('calls out the common Latvian endings', () => {
    expect(vocative('Jānis')).toBe('Jāni');
    expect(vocative('Pēteris')).toBe('Pēteri');
    expect(vocative('Mārtiņš')).toBe('Mārtiņ');
    expect(vocative('Jēkabs')).toBe('Jēkab');
    expect(vocative('Mikus')).toBe('Miku');
    expect(vocative('Grieta')).toBe('Grieta');
    expect(vocative('Līze')).toBe('Līze');
  });
  it('leaves a short or empty name alone', () => {
    expect(vocative('')).toBe('');
    expect(vocative('Ivs')).toBe('Ivs');
  });
});

describe('personalise', () => {
  const him = { female: false, name: 'Jānis' };
  const her = { female: true, name: 'Grieta' };
  it('picks the masculine or feminine form', () => {
    expect(personalise('Tu esi {gājis|gājusi}.', him)).toBe('Tu esi gājis.');
    expect(personalise('Tu esi {gājis|gājusi}.', her)).toBe('Tu esi gājusi.');
  });
  it('fills the name and the called name', () => {
    expect(personalise('«Aiziesi, {nameV}?» — {name}', him)).toBe('«Aiziesi, Jāni?» — Jānis');
    expect(personalise('«Aiziesi, {nameV}?»', her)).toBe('«Aiziesi, Grieta?»');
  });
  it('leaves the {} slot for fillLoc untouched', () => {
    expect(personalise('{} rokā.', him)).toBe('{} rokā.');
  });
  it('handles several marks in one line', () => {
    expect(personalise('{viltīgs|viltīga} un {gudrs|gudra}', her)).toBe('viltīga un gudra');
  });
});
