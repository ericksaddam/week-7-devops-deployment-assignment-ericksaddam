// socket.js - Socket.io client setup
import { io } from 'socket.io-client';
import { useEffect, useState, useCallback } from 'react';
import { getSocketDetails } from '../utils/socketConfig';

const { SOCKET_URL, options } = getSocketDetails();

// Define getToken before using it
const getToken = () => localStorage.getItem('token');

// Create socket instance
export const socket = io(SOCKET_URL, {
  ...options,
  auth: {
    token: getToken(),
  },
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState(null);

  const connect = useCallback((username) => {
    try {
      socket.auth = { token: getToken() };
      socket.connect();
      if (username) {
        socket.emit('user_join', username);
      }
    } catch (err) {
      setError(err.message);
      console.error('Socket connection error:', err);
    }
  }, []);

  const disconnect = useCallback(() => {
    try {
      socket.disconnect();
    } catch (err) {
      setError(err.message);
      console.error('Socket disconnection error:', err);
    }
  }, []);

  const joinRoom = useCallback((room) => {
    if (socket && socket.connected) {
      socket.emit('join_room', room);
    }
  }, []);

  const leaveRoom = useCallback((room) => {
    if (socket && socket.connected) {
      socket.emit('leave_room', room);
    }
  }, []);

  const setTyping = useCallback((isTyping) => {
    if (socket && socket.connected) {
      socket.emit('typing', { isTyping });
    }
  }, []);

  const sendMessage = useCallback(({ room, message, isPrivate = false }) => {
    return new Promise((resolve, reject) => {
      if (!socket || !socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('send_message', { room, message, isPrivate }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }, []);

  // Socket event listeners
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (err) => {
      setError(`Connection error: ${err.message}`);
      console.error('Socket connection error:', err);
    };

    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };

    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onTypingStart = ({ username, room }) => {
      setTypingUsers((prev) => {
        if (!prev.includes(username)) {
          return [...prev, username];
        }
        return prev;
      });
    };

    const onTypingStop = ({ username, room }) => {
      setTypingUsers((prev) => prev.filter(user => user !== username));
    };

    // Register event handlers
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('receive_message', onReceiveMessage);
    socket.on('user_list', onUserList);
    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('receive_message', onReceiveMessage);
      socket.off('user_list', onUserList);
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    setTyping,
    socket,
  };
};

export default socket;