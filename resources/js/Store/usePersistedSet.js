import { useEffect, useState } from 'react';

export function usePersistedSet(key, defaultValue = []) {
  const [set, setSet] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? new Set(JSON.parse(saved)) : new Set(defaultValue);
    } catch (e) {
      return new Set(defaultValue);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.error(`Failed to persist key "${key}" to localStorage`, e);
    }
  }, [key, set]);

  return [set, setSet];
}

// Usage:
// const [collapsedMachines, setCollapsedMachines] = usePersistedSet('collapsedMachines');