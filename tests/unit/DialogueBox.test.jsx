// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import DialogueBox from '../../src/ui/DialogueBox';

afterEach(() => {
  cleanup();
});

test('renders text prop', () => {
  render(<DialogueBox text="I don't have time." />);
  expect(screen.getByText("I don't have time.")).toBeDefined();
});

test('renders with empty text gracefully', () => {
  render(<DialogueBox text="" />);
  expect(screen.getByTestId('dialogue-box')).toBeDefined();
});

test('renders with flexbox card layout structure', () => {
  render(<DialogueBox text="Position test" speaker="SKEPTICAL STEVE" pager="1 / 3" />);
  const box = screen.getByTestId('dialogue-box');
  expect(box.className).toContain('dialogue-box');
  expect(box.className).toContain('card');
  expect(screen.getByText("Position test")).toBeDefined();
  expect(screen.getByText("SKEPTICAL STEVE")).toBeDefined();
  expect(screen.getByText("1 / 3")).toBeDefined();
});
