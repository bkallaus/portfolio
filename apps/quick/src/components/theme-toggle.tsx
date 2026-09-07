import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme, type Theme } from '../lib/theme';

const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

const ThemeToggle = () => {
  const { theme, setThemeAnimated } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex gap-0.5 rounded-lg border border-border p-0.5"
    >
      {options.map(({ value, label, Icon }) => (
        <Button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          variant={theme === value ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={(e) =>
            setThemeAnimated(value, { x: e.clientX, y: e.clientY })
          }
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
};

export default ThemeToggle;
