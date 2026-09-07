import React, { useState, useEffect, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import ThemeToggle from './theme-toggle';
import { toolCategories } from '../lib/tools';

const NavLinks = ({ onClick }: { onClick?: () => void }) => (
  <div className="flex flex-col gap-4">
    {toolCategories.map((category) => (
      <div key={category.id}>
        <h2 className="px-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {category.label}
        </h2>
        <ul aria-label={category.label} className="flex flex-col gap-1 list-none p-0 m-0">
          {category.tools.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={onClick}
                className="block rounded-md px-3 py-2 text-sm text-foreground/80 no-underline transition-colors hover:bg-accent hover:text-foreground"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

const SideNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close on escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, closeMobile]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile hamburger button — fixed at top-left */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-out drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 
          bg-background border-r border-border
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:hidden
          overflow-y-auto
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Navigation</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeMobile}
              aria-label="Close navigation menu"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <nav className="p-3">
          <NavLinks onClick={closeMobile} />
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className="side-nav hidden md:block w-64 shrink-0 border-r border-border min-h-screen p-4 bg-muted/30">
        <div className="mb-3 flex justify-center">
          <ThemeToggle />
        </div>
        <nav>
          <NavLinks />
        </nav>
      </aside>
    </>
  );
};

export default SideNav;
