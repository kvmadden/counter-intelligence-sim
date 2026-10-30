// @vitest-environment jsdom
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EncounterContainer from '../../src/ui/EncounterContainer';

test('renders core layout areas', () => {
  render(<EncounterContainer />);
  expect(screen.getByTestId('patient-sprite-area')).toBeDefined();
  expect(screen.getByTestId('dialogue-box')).toBeDefined();
  expect(screen.getByTestId('action-menu')).toBeDefined();
});
