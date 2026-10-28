import { ChevronDown, ChevronUp } from 'lucide-react';
import { getAdjacentSection, SectionId } from '../lib/sectionNav';

interface SectionNavProps {
  sections: SectionId[];
  current: SectionId;
  className?: string;
}

function goTo(id: SectionId) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

const buttonClass =
  'inline-flex items-center justify-center h-9 w-9 rounded-full border border-amber-500/20 hover:border-amber-500 text-amber-400/80 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 transition-colors';

export default function SectionNav({ sections, current, className = '' }: SectionNavProps) {
  const prev = getAdjacentSection(sections, current, 'prev');
  const next = getAdjacentSection(sections, current, 'next');
  if (!prev && !next) return null;

  return (
    <nav aria-label="Navegación entre secciones" className={`flex items-center justify-center gap-3 ${className}`}>
      {prev && (
        <button type="button" onClick={() => goTo(prev)} className={buttonClass} aria-label="Sección anterior">
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
      {next && (
        <button type="button" onClick={() => goTo(next)} className={buttonClass} aria-label="Siguiente sección">
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </nav>
  );
}
