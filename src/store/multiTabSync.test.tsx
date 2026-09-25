/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ContactsProvider, useContacts } from './contactsStore';
import {
  ScanStrategyProvider,
  useScanStrategy,
  DEFAULT_SCAN_STRATEGY,
} from '../context/ScanStrategyContext';

describe('Multi-tab synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('synchronizes contacts between tabs', () => {
    const { result } = renderHook(() => useContacts(), { wrapper: ContactsProvider });

    expect(result.current.contacts).toEqual([]);

    // Simulate another tab adding a contact
    const newContacts = [{ address: 'G123', name: 'Alice', addedAt: Date.now() }];
    act(() => {
      localStorage.setItem('wraith-contacts', JSON.stringify(newContacts));
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'wraith-contacts',
          newValue: JSON.stringify(newContacts),
        }),
      );
    });

    expect(result.current.contacts).toEqual(newContacts);

    // Simulate another tab clearing data
    act(() => {
      localStorage.removeItem('wraith-contacts');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'wraith-contacts',
          newValue: null,
        }),
      );
    });

    expect(result.current.contacts).toEqual([]);
  });

  it('synchronizes scan strategy between tabs', () => {
    const { result } = renderHook(() => useScanStrategy(), { wrapper: ScanStrategyProvider });

    expect(result.current.strategy).toBe(DEFAULT_SCAN_STRATEGY);

    // Simulate another tab changing strategy
    act(() => {
      localStorage.setItem('wraith-scan-strategy', 'fast');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'wraith-scan-strategy',
          newValue: 'fast',
        }),
      );
    });

    expect(result.current.strategy).toBe('fast');

    // Simulate clear
    act(() => {
      localStorage.clear();
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: null,
        }),
      );
    });

    expect(result.current.strategy).toBe(DEFAULT_SCAN_STRATEGY);
  });
});
