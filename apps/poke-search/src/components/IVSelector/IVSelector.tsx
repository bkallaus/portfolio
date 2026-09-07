import type { SearchSegment } from '../../hooks/useSearchString';
import { StandardAttributeButton } from '../StandardAttributeButton/StandardAttributeButton';

interface IVSelectorProps {
  segments: SearchSegment[];
  onToggle: (value: string) => void;
}

export function IVSelector({ segments, onToggle }: IVSelectorProps) {
  const stars = ['0*', '1*', '2*', '3*', '4*'];

  return (
    <>
      {stars.map((star) => {
        const segment = segments.find(s => s.value === star);
        return (
          <StandardAttributeButton
            key={star}
            label={`${star} IV`}
            value={star}
            onToggle={onToggle}
            isActive={segment !== undefined && segment.inclusive === true}
            isExcluded={segment !== undefined && segment.inclusive === false}
          />
        );
      })}
    </>
  );
}
