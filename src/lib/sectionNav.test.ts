import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdjacentSection, getVisibleSections } from './sectionNav';

test('con galería y ceremonia sigue el orden completo', () => {
  const s = getVisibleSections({ hasGallery: true, hasCeremony: true, hasItinerary: true });
  assert.deepEqual(s, ['hero', 'our-story', 'date', 'ceremony', 'reception', 'location', 'itinerary', 'rsvp-section']);
  assert.equal(getAdjacentSection(s, 'hero', 'next'), 'our-story');
});

test('sin galería la portada avanza a la fecha', () => {
  const s = getVisibleSections({ hasGallery: false, hasCeremony: true, hasItinerary: false });
  assert.equal(s.includes('our-story'), false);
  assert.equal(getAdjacentSection(s, 'hero', 'next'), 'date');
});

test('sin ceremonia no hay paso de ceremonia', () => {
  const s = getVisibleSections({ hasGallery: true, hasCeremony: false, hasItinerary: false });
  assert.equal(s.includes('ceremony'), false);
  assert.equal(getAdjacentSection(s, 'date', 'next'), 'reception');
  assert.equal(getAdjacentSection(s, 'location', 'next'), 'rsvp-section');
});

test('los extremos no tienen anterior ni siguiente', () => {
  const s = getVisibleSections({ hasGallery: false, hasCeremony: false, hasItinerary: false });
  assert.equal(getAdjacentSection(s, 'hero', 'prev'), null);
  assert.equal(getAdjacentSection(s, 'rsvp-section', 'next'), null);
  assert.equal(getAdjacentSection(s, 'rsvp-section', 'prev'), 'location');
});
