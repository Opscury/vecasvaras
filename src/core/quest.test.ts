import { describe, expect, it, beforeEach } from 'vitest';
import { currentStep } from './quest';
import { state } from './state';
import { bag } from './inventory';

/**
 * The step is what the corner of the screen says, what Anna says, and what the
 * two exits allow — all three read this one function, so a wrong answer here is
 * a player told to go somewhere the game will not let them go.
 *
 * The order below is the whole run, in order. Each `it` is one move.
 */
describe('the run, one step at a time', () => {
  beforeEach(() => {
    state.reset();
  });

  it('starts by sending the player to Anna', () => {
    expect(currentStep()).toBe('meetElder');
  });

  it('asks for the sickle once she has given the errand', () => {
    state.set('metElder', true);
    expect(currentStep()).toBe('takeSickle');
  });

  it('sends the player to the field once the sickle is in the bag', () => {
    state.set('metElder', true);
    bag.add('sickle');
    expect(currentStep()).toBe('harvest');
  });

  it('sends them back to Anna once the field is cut, either way', () => {
    state.set('metElder', true);
    bag.add('sickle');
    for (const outcome of ['good', 'poor'] as const) {
      state.set('jumis', outcome);
      expect(currentStep()).toBe('returnHarvest');
    }
  });

  it('opens the bog only once Anna has been paid for the harvest', () => {
    state.set('metElder', true);
    state.set('jumis', 'good');
    expect(state.bogOpen).toBe(false);
    state.set('jumisPaid', true);
    expect(state.bogOpen).toBe(true);
    expect(currentStep()).toBe('crossBog');
  });

  it('sends them back to Anna again once the crossing is settled', () => {
    state.set('metElder', true);
    state.set('jumis', 'good');
    state.set('jumisPaid', true);
    state.set('velns', 'poor');
    expect(currentStep()).toBe('returnBog');
  });

  it('only reaches the stone once both debts have been reported', () => {
    state.set('metElder', true);
    state.set('jumis', 'good');
    state.set('jumisPaid', true);
    state.set('velns', 'good');
    expect(currentStep()).not.toBe('done');
    state.set('velnsPaid', true);
    expect(currentStep()).toBe('done');
  });

  it('does not lose the field to a sickle put down mid-run', () => {
    // The step is derived, not stored, so it has to survive the bag changing
    // under it: dropping the sickle before the field is cut must not skip
    // the harvest, it must ask for the sickle again.
    state.set('metElder', true);
    bag.add('sickle');
    expect(currentStep()).toBe('harvest');
    bag.remove('sickle');
    expect(currentStep()).toBe('takeSickle');
  });
});
