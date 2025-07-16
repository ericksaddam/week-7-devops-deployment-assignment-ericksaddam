// socketConfig.js
export const getSocketDetails = () => {
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  
  return {
    SOCKET_URL,
    API_URL,
    options: {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    }
  };
};
