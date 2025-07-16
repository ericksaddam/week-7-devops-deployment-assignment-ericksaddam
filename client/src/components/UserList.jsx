import React, { useEffect, useState } from 'react';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text, VStack, useToast } from '@chakra-ui/react';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch(import.meta.env.VITE_API_URL + '/api/users', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error fetching users',
          description: 'Please make sure the server is running.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    // Poll for users every 30 seconds
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  if (loading) {
    return (
      <Box p={4}>
        <Text>Loading users...</Text>
      </Box>
    );
  }

  return (
    <Box mt={8} p={4} borderWidth={1} borderRadius="lg" boxShadow="md">
      <Heading size="md" mb={4}>All Users</Heading>
      {users.length === 0 ? (
        <Text color="gray.500">No users online</Text>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Username</Th>
              <Th>Email</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map(user => (
              <Tr key={user._id || user.username}>
                <Td>{user.username}</Td>
                <Td>{user.email}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
};

export default UserList;
