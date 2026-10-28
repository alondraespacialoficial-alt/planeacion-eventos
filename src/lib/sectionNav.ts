export type SectionId =
  | 'hero'
  | 'our-story'
  | 'date'
  | 'ceremony'
  | 'reception'
  | 'location'
  | 'itinerary'
  | 'rsvp-section';

export interface SectionFlags {
  hasGallery: boolean;
  hasCeremony: boolean;
  hasItinerary: boolean;
}

// Orden visual de la invitación; solo incluye las secciones que se renderizan.
export function getVisibleSections({ hasGallery, hasCeremony, hasItinerary }: SectionFlags): SectionId[] {
  const sections: SectionId[] = ['hero'];
  if (hasGallery) sections.push('our-story');
  sections.push('date');
  if (hasCeremony) sections.push('ceremony');
  sections.push('reception', 'location');
  if (hasItinerary) sections.push('itinerary');
  sections.push('rsvp-section');
  return sections;
}

export function getAdjacentSection(sections: SectionId[], current: SectionId, direction: 'next' | 'prev'): SectionId | null {
  const index = sections.indexOf(current);
  if (index === -1) return null;
  return sections[direction === 'next' ? index + 1 : index - 1] ?? null;
}
