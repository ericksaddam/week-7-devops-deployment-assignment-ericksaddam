import React, { useState } from 'react';
import { ChakraProvider, Box, Heading } from '@chakra-ui/react';
import Chat from './components/Chat';
import Auth from './components/Auth';
import UserList from './components/UserList';

function App() {
  const [user, setUser] = useState(localStorage.getItem('token') ? localStorage.getItem('username') : null);

  const handleAuth = (username) => {
    setUser(username);
    localStorage.setItem('username', username);
  };

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.100" p={4}>
        <Heading textAlign="center" mb={6}>
          Chat App
        </Heading>
        {user ? (
          <>
            <Chat username={user} />
            <UserList />
          </>
        ) : (
          <Auth onAuth={handleAuth} />
        )}
      </Box>
    </ChakraProvider>
  );
}

export default App;
