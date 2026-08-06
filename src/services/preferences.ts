export const PreferencesService = {
  getPageSize: (key: string, defaultValue: number = 10): number => {
    try {
      const value = localStorage.getItem(`pageSize_${key}`);
      return value ? parseInt(value, 10) : defaultValue;
    } catch (error) {
      console.warn('Error reading from localStorage', error);
      return defaultValue;
    }
  },
  setPageSize: (key: string, size: number): void => {
    try {
      localStorage.setItem(`pageSize_${key}`, size.toString());
    } catch (error) {
      console.warn('Error writing to localStorage', error);
    }
  },
};
