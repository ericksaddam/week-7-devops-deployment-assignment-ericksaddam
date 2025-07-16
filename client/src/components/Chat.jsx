import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Button, Input, VStack, Text, HStack, Avatar, Badge, useToast, Select, IconButton, Tooltip, Spinner
} from '@chakra-ui/react';
import { useSocket } from '../socket/socket';
import { format } from 'date-fns';
import { FaRegSmile, FaSearch, FaPaperclip, FaArrowUp, FaCheck, FaCheckDouble, FaSignOutAlt, FaUser, FaPlus } from 'react-icons/fa';

const Chat = ({ username: initialUsername }) => {
  const [username, setUsername] = useState(initialUsername || '');
  const [input, setInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [typing, setTyping] = useState(false);
  const [room, setRoom] = useState('general');
  const [rooms, setRooms] = useState(['general']);
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [paginationOffset, setPaginationOffset] = useState(0);
  const [paginatedMessages, setPaginatedMessages] = useState([]);
  const [profile, setProfile] = useState(null);
  const [newRoom, setNewRoom] = useState('');
  const toast = useToast();
  const fileInputRef = useRef();
  const {
    isConnected,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    setTyping: setSocketTyping,
    socket,
    error,
    joinRoom,
  } = useSocket();

  // Define fetchMessages before using it in useEffect
  const fetchMessages = useCallback((offset = 0) => {
    if (!socket || !room) return;
    
    setLoading(true);
    socket.emit('fetch_messages', { room, offset, limit: 20 }, (msgs) => {
      setPaginatedMessages(prev => 
        offset === 0 ? msgs : [...msgs, ...prev]
      );
      setLoading(false);
    });
  }, [socket, room]);

  // Fetch rooms on mount
  useEffect(() => {
    fetch('http://localhost:5001/api/rooms')
      .then(res => res.json())
      .then(setRooms)
      .catch(err => {
        console.error('Error fetching rooms:', err);
        toast({
          title: 'Error fetching rooms',
          status: 'error',
          duration: 3000,
        });
      });
  }, [toast]);

  // Fetch user profile
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5001/api/profile', { 
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(setProfile)
        .catch(err => {
          console.error('Error fetching profile:', err);
          toast({
            title: 'Error fetching profile',
            status: 'error',
            duration: 3000,
          });
        });
    }
  }, [toast]);

  // Join room on join
  useEffect(() => {
    if (joined && username && socket) {
      joinRoom(room);
      fetchMessages(0);
    }
  }, [joined, room, username, socket, joinRoom, fetchMessages]);

  // Reconnection handling
  useEffect(() => {
    if (!isConnected) {
      toast({
        title: 'Connection lost',
        description: 'Attempting to reconnect...',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [isConnected, toast]);

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: 'Socket Error',
        description: error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [error, toast]);

  // Handle join
  const handleJoin = useCallback(() => {
    if (!username.trim()) {
      toast({
        title: 'Enter a username',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    connect(username);
    setJoined(true);
  }, [username, connect, toast]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() && !file) {
      return;
    }

    const messageContent = input.trim();
    try {
      // Optimistically add the message to the UI
      const tempMessage = {
        id: Date.now(),
        message: messageContent,
        sender: username,
        room,
        timestamp: new Date().toISOString(),
      };
      setPaginatedMessages(prev => [...prev, tempMessage]);
      
      // Clear input immediately for better UX
      setInput('');
      setFile(null);

      // Actually send the message
      await sendMessage({ 
        room, 
        message: messageContent,
        isPrivate: false
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove the temporary message if sending failed
      setPaginatedMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Typing indicator
  const handleInput = useCallback((e) => {
    setInput(e.target.value);
    if (!typing && e.target.value.trim()) {
      setTyping(true);
      setSocketTyping(true);
    } else if (!e.target.value.trim()) {
      setTyping(false);
      setSocketTyping(false);
    }
  }, [typing, setSocketTyping]);

  // Stop typing on blur
  const handleBlur = useCallback(() => {
    setTyping(false);
    setSocketTyping(false);
  }, [setSocketTyping]);

  // Handle room switch
  const handleRoomChange = (e) => {
    setRoom(e.target.value);
    setPaginationOffset(0);
    setPaginatedMessages([]);
  };

  // Handle file upload
  const handleFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  // Handle reaction
  const handleReact = (msgId, reaction) => {
    socket.emit('react_message', { room, messageId: msgId, reaction });
  };

  // Handle read receipt
  const handleRead = (msgId) => {
    socket.emit('read_message', { room, messageId: msgId });
  };

  // Handle search
  const handleSearch = () => {
    if (!search.trim()) return;
    socket.emit('search_messages', { room, query: search }, setSearchResults);
  };

  // Handle load more (pagination)
  const handleLoadMore = () => {
    const newOffset = paginationOffset + 20;
    setPaginationOffset(newOffset);
    fetchMessages(newOffset);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.reload();
  };

  // Add room handler
  const handleAddRoom = async () => {
    if (!newRoom.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ room: newRoom.trim() })
      });
      
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || [...rooms, newRoom.trim()]);
        setNewRoom('');
      } else {
        toast({
          title: 'Error creating room',
          description: data.error || 'Something went wrong',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create room',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Listen for unread count updates
  useEffect(() => {
    if (joined) {
      socket.emit('get_unread', { room }, setUnread);
    }
    // eslint-disable-next-line
  }, [messages, room]);

  // Listen for sound/browser notifications
  useEffect(() => {
    if (messages.length > 0 && document.hidden) {
      // Play sound
      const audio = new Audio('/notification.mp3');
      audio.play();
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('New message', { body: messages[messages.length - 1].message });
      }
    }
  }, [messages]);

  // Request notification permission
  useEffect(() => {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Update paginatedMessages when a new message arrives for the current room
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.room === room) {
      setPaginatedMessages((prev) => {
        // Avoid duplicate messages
        if (prev.some((msg) => (msg._id || msg.id) === (lastMsg._id || lastMsg.id))) return prev;
        return [...prev, lastMsg];
      });
      // Scroll to bottom when new message arrives
      const chatBox = document.querySelector('[data-chat-box]');
      if (chatBox) {
        setTimeout(() => {
          chatBox.scrollTop = chatBox.scrollHeight;
        }, 100);
      }
    }
  }, [messages, room]);

  // Listen for message reactions and update message state
  useEffect(() => {
    if (!socket) return;
    const handleReaction = ({ messageId, userId, reaction }) => {
      setPaginatedMessages((prevMsgs) =>
        prevMsgs.map((msg) => {
          if ((msg._id || msg.id) === messageId) {
            const newReactions = { ...(msg.reactions || {}) };
            newReactions[userId] = reaction;
            return { ...msg, reactions: newReactions };
          }
          return msg;
        })
      );
    };
    socket.on('message_reaction', handleReaction);
    return () => socket.off('message_reaction', handleReaction);
  }, [socket]);

  // Auto-join if username is provided
  useEffect(() => {
    if (initialUsername && !joined) {
      setUsername(initialUsername);
      connect(initialUsername);
      setJoined(true);
    }
  }, [initialUsername, joined, connect]);

  return (
    <Box maxW="700px" mx="auto" mt={10} p={4} borderWidth={1} borderRadius="lg" boxShadow="md">
      <HStack justify="space-between" mb={2}>
        <HStack>
          <FaUser />
          <Text fontWeight="bold">{profile?.username || username}</Text>
        </HStack>
        <Button leftIcon={<FaSignOutAlt />} colorScheme="gray" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </HStack>
      {!joined && !initialUsername ? (
        <VStack spacing={4}>
          <Input
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <Button colorScheme="blue" onClick={handleJoin} isFullWidth>
            Join Chat
          </Button>
        </VStack>
      ) : (
        <>
          <HStack mb={2}>
            <Select value={room} onChange={handleRoomChange} w="150px">
              {rooms.map((r) => (
                <option key={r._id || r} value={r.name || r}>{r.name || r}</option>
              ))}
            </Select>
            <Input
              placeholder="Add new room"
              value={newRoom}
              onChange={e => setNewRoom(e.target.value)}
              w="120px"
            />
            <IconButton icon={<FaPlus />} onClick={handleAddRoom} aria-label="Add room" />
            <Badge colorScheme="purple">Unread: {unread}</Badge>
          </HStack>
          <HStack spacing={2} mb={2}>
            {users.map((user) => (
              <Badge key={user._id || user.id || user.username} colorScheme={user.username === username ? 'green' : 'blue'}>
                {user.username}
              </Badge>
            ))}
          </HStack>
          <HStack mb={2}>
            <Input
              placeholder="Search messages..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              w="200px"
            />
            <IconButton icon={<FaSearch />} onClick={handleSearch} aria-label="Search" />
          </HStack>
          <Box h="350px" overflowY="auto" borderWidth={1} borderRadius="md" p={2} mb={2} bg="gray.50" data-chat-box>
            {loading && <Spinner size="sm" />}
            {searchResults.length > 0 ? searchResults.map((msg) => (
              <Box key={msg._id || msg.id} mb={2} bg="yellow.50">
                <Text fontSize="xs" color="gray.400">[Search Result]</Text>
                <Text>{msg.message}</Text>
              </Box>
            )) : paginatedMessages.map((msg) => (
              <Box key={msg._id || msg.id} mb={2}>
                {msg.system ? (
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    {msg.message}
                  </Text>
                ) : (
                  <HStack align="start">
                    <Avatar size="xs" name={msg.sender} />
                    <VStack align="start" spacing={0}>
                      <HStack>
                        <Text fontWeight="bold" fontSize="sm">
                          {msg.sender}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          {format(new Date(msg.timestamp), 'HH:mm:ss')}
                        </Text>
                        {msg.readBy && msg.readBy.length > 1 && <FaCheckDouble color="blue" title="Read by others" />}
                        {msg.readBy && msg.readBy.length === 1 && <FaCheck color="gray" title="Delivered" />}
                      </HStack>
                      {msg.file && (
                        <a href={msg.file.data} download={msg.file.filename} target="_blank" rel="noopener noreferrer">
                          <Text color="blue.500">📎 {msg.file.filename}</Text>
                        </a>
                      )}
                      <Text>{msg.message}</Text>
                    </VStack>
                  </HStack>
                )}
              </Box>
            ))}
            <Button size="sm" onClick={handleLoadMore} mt={2}>
              Load older messages
            </Button>
          </Box>
          {typingUsers.length > 0 && (
            <Text fontSize="xs" color="gray.500" mb={2}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </Text>
          )}
          <HStack>
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={handleInput}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              isDisabled={!isConnected}
            />
            <IconButton icon={<FaPaperclip />} onClick={() => fileInputRef.current.click()} aria-label="Attach file" />
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <Button colorScheme="blue" onClick={handleSend} isDisabled={!isConnected || (!input.trim() && !file)}>
              Send
            </Button>
          </HStack>
        </>
      )}
    </Box>
  );
};

export default Chat;
