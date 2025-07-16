import React, { useState } from 'react';
import { Box, Button, Input, VStack, Text, useToast, Tabs, TabList, TabPanels, Tab, TabPanel, useColorModeValue, Flex } from '@chakra-ui/react';

const API_URL = import.meta.env.VITE_API_URL;

const Auth = ({ onAuth }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [tabIndex, setTabIndex] = useState(0);
  const tabBg = useColorModeValue('gray.100', 'gray.700');
  const activeTabBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('blue.400', 'blue.300');

  const handleAuth = async (type) => {
    setLoading(true);
    try {
      if (type === 'signup') {
        if (!username || !email || !password || !confirmPassword) throw new Error('All fields are required');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Invalid email');
        if (password !== confirmPassword) throw new Error('Passwords do not match');
      } else {
        if (!email || !password) throw new Error('Email and password required');
      }
      const res = await fetch(`${API_URL}/api/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'signup' ? { username, email, password } : { email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');
      if (type === 'login') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('email', data.email);
        onAuth(data.username);
      } else {
        toast({ title: 'Sign up successful! Please log in.', status: 'success' });
        setTabIndex(0);
      }
    } catch (e) {
      toast({ title: e.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Box maxW="400px" w="100%" p={8} borderWidth={1} borderRadius="lg" boxShadow="lg" bg={useColorModeValue('white', 'gray.800')}>
        <Tabs
          isFitted
          variant="unstyled"
          index={tabIndex}
          onChange={setTabIndex}
        >
          <TabList mb="1em">
            <Tab
              _selected={{ color: 'white', bg: 'blue.500', borderColor, border: '1px solid', borderBottom: 'none', zIndex: 1 }}
              bg={tabBg}
              borderTopLeftRadius="md"
              borderTopRightRadius="md"
              fontWeight="bold"
              fontSize="lg"
              px={6}
              py={2}
              mr={2}
            >
              Login
            </Tab>
            <Tab
              _selected={{ color: 'white', bg: 'green.500', borderColor, border: '1px solid', borderBottom: 'none', zIndex: 1 }}
              bg={tabBg}
              borderTopLeftRadius="md"
              borderTopRightRadius="md"
              fontWeight="bold"
              fontSize="lg"
              px={6}
              py={2}
            >
              Sign Up
            </Tab>
          </TabList>
          <TabPanels bg={activeTabBg} borderRadius="md" borderWidth={1} borderColor={borderColor} p={6}>
            <TabPanel>
              <VStack spacing={4}>
                <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                <Button colorScheme="blue" isLoading={loading} onClick={() => handleAuth('login')} w="100%" size="lg">
                  Login
                </Button>
              </VStack>
            </TabPanel>
            <TabPanel>
              <VStack spacing={4}>
                <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                <Input placeholder="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                <Button colorScheme="green" isLoading={loading} onClick={() => handleAuth('signup')} w="100%" size="lg">
                  Sign Up
                </Button>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Flex>
  );
};

export default Auth;
