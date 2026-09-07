import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SideNav from './side-nav';
import { toolCategories } from '../lib/tools';

// SideNav mounts NavLinks twice (mobile drawer + desktop sidebar), so every
// label appears once per nav. Scope queries to a single nav to stay unambiguous.
const renderNav = () => {
  render(<SideNav />);
  return screen.getAllByRole('navigation')[0];
};

describe('SideNav', () => {
  test('renders a heading for every category', () => {
    const nav = renderNav();

    toolCategories.forEach(({ label }) => {
      expect(within(nav).getByRole('heading', { name: label })).toBeInTheDocument();
    });
  });

  test('renders every tool link under its own category', () => {
    const nav = renderNav();

    toolCategories.forEach((category) => {
      const list = within(nav).getByRole('list', { name: category.label });

      category.tools.forEach(({ label }) => {
        expect(within(list).getByText(label)).toBeInTheDocument();
      });
    });
  });

  test('links have correct href attributes', () => {
    const nav = renderNav();

    toolCategories.flatMap((category) => category.tools).forEach(({ id, label }) => {
      expect(within(nav).getByText(label).closest('a')).toHaveAttribute('href', `#${id}`);
    });
  });
});
