import test from 'node:test';
import assert from 'node:assert/strict';
import { relationFromBody, seasonalStrength } from '../../src/domain/five-elements.js';

test('five-element relations are expressed from the body perspective', () => {
  assert.equal(relationFromBody('wood', 'fire'), 'body_generates_use');
  assert.equal(relationFromBody('wood', 'metal'), 'use_overcomes_body');
  assert.equal(relationFromBody('water', 'water'), 'same_element');
});

test('earth prospers in the four seasonal transition months', () => {
  assert.equal(seasonalStrength('earth', 6), 'prosperous');
  assert.equal(seasonalStrength('fire', 6), 'prosperous');
  assert.equal(seasonalStrength('metal', 6), 'resting');
});
