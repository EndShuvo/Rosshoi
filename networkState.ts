let isNetworkError = false;
const listeners: ((val: boolean) => void)[] = [];

export const getNetworkError = () => isNetworkError;

export const setNetworkError = (val: boolean) => {
  if (isNetworkError !== val) {
    isNetworkError = val;
    listeners.forEach(l => l(val));
  }
};

export const subscribeToNetworkError = (listener: (val: boolean) => void) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
};
