// @vitest-environment jsdom
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ActionMenu from '../../src/ui/ActionMenu';

afterEach(() => {
  cleanup();
});

test('calls onPress callback on Press button click', () => {
  const onPress = vi.fn();
  const onPresent = vi.fn();
  render(<ActionMenu onPress={onPress} onPresent={onPresent} />);
  fireEvent.click(screen.getByRole('button', { name: /press/i }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('calls onPresent callback on Present button click', () => {
  const onPress = vi.fn();
  const onPresent = vi.fn();
  render(<ActionMenu onPress={onPress} onPresent={onPresent} />);
  fireEvent.click(screen.getByRole('button', { name: /present/i }));
  expect(onPresent).toHaveBeenCalledTimes(1);
});

test('renders container and both action buttons with proper hierarchy and labels', () => {
  render(<ActionMenu onPress={() => {}} onPresent={() => {}} />);
  const menu = screen.getByTestId('action-menu');
  const pressBtn = screen.getByRole('button', { name: /press/i });
  const presentBtn = screen.getByRole('button', { name: /present/i });

  expect(menu.contains(pressBtn)).toBe(true);
  expect(menu.contains(presentBtn)).toBe(true);
  expect(pressBtn.textContent).toBe('Press');
  expect(presentBtn.textContent).toBe('Present');
});

test('handles clicks safely when callbacks are omitted', () => {
  render(<ActionMenu />);
  const pressBtn = screen.getByRole('button', { name: /press/i });
  const presentBtn = screen.getByRole('button', { name: /present/i });

  expect(() => fireEvent.click(pressBtn)).not.toThrow();
  expect(() => fireEvent.click(presentBtn)).not.toThrow();
});
