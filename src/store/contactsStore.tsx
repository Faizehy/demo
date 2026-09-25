import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
interface Contact {
  address: string;
  name: string;
  addedAt: number;
}

interface ContactsContextValue {
  contacts: Contact[];
  addContact: (address: string, name: string) => void;
  removeContact: (address: string) => void;
  isKnownAddress: (address: string) => boolean;
  getContactName: (address: string) => string | undefined;
}

const ContactsContext = createContext<ContactsContextValue | null>(null);

const STORAGE_KEY = 'wraith-contacts';

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Load contacts from localStorage on mount and sync across tabs
  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setContacts(JSON.parse(stored));
        }
      } catch {
        // Ignore parse errors
      }
    };

    load();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          try {
            const incoming = JSON.parse(e.newValue) as Contact[];
            setContacts((prev: Contact[]) => {
              // Merge changes, favoring incoming (which is the latest saved state),
              // while keeping any local contacts that might have been added concurrently.
              const map = new Map<string, Contact>();
              prev.forEach((c) => map.set(c.address, c));
              incoming.forEach((c) => {
                const existing = map.get(c.address);
                if (!existing || existing.addedAt <= c.addedAt) {
                  map.set(c.address, c);
                }
              });

              const next = Array.from(map.values());
              if (JSON.stringify(next) !== e.newValue) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              }
              return next;
            });
          } catch {
            // Ignore
          }
        } else {
          setContacts([]);
        }
      } else if (e.key === null) {
        // LocalStorage cleared
        setContacts([]);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addContact = useCallback((address: string, name: string) => {
    setContacts((prev: Contact[]) => {
      // Merge with latest from storage to avoid overwriting other tabs' additions
      let currentStore = prev;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) currentStore = parsed;
        }
      } catch {}

      const filtered = currentStore.filter((c) => c.address !== address);
      const next = [...filtered, { address, name, addedAt: Date.now() }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeContact = useCallback((address: string) => {
    setContacts((prev: Contact[]) => {
      let currentStore = prev;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) currentStore = parsed;
        }
      } catch {}

      const next = currentStore.filter((c) => c.address !== address);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isKnownAddress = useCallback(
    (address: string) => {
      return contacts.some((c: Contact) => c.address === address);
    },
    [contacts],
  );

  const getContactName = useCallback(
    (address: string) => {
      return contacts.find((c: Contact) => c.address === address)?.name;
    },
    [contacts],
  );

  return (
    <ContactsContext.Provider
      value={{ contacts, addContact, removeContact, isKnownAddress, getContactName }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContacts must be used within ContactsProvider');
  return ctx;
}
