// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Message schema
const messageSchema = new mongoose.Schema({
  sender: String,
  senderId: String,
  room: String,
  message: String,
  timestamp: Date,
  reactions: Object,
  readBy: [String],
  file: Object,
  image: Object,
  isPrivate: Boolean,
});
const Message = mongoose.model('Message', messageSchema);

// Room schema
const roomSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
});
const Room = mongoose.model('Room', roomSchema);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// API routes (move these above express.static)
app.get('/api/rooms', async (req, res) => {
  const allRooms = await Room.find().lean();
  res.json(allRooms.map(r => r.name));
});
app.get('/api/messages', (req, res) => {
  res.json(messages);
});
// Get all users with emails
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username email').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users, messages, and rooms
const users = {};
const messages = {}; // { roomName: [messages] }
const typingUsers = {};
const unreadCounts = {}; // { userId: { room: count } }
const readReceipts = {}; // { room: { messageId: [userId] } }
const reactions = {}; // { messageId: { userId: reaction } }
const rooms = ['general', 'random', 'tech']; // Example rooms

// Helper: get messages for a room
function getRoomMessages(room) {
  if (!messages[room]) messages[room] = [];
  return messages[room];
}

// Helper: add unread count
function incrementUnread(room, excludeId) {
  Object.keys(users).forEach((id) => {
    if (id !== excludeId) {
      if (!unreadCounts[id]) unreadCounts[id] = {};
      unreadCounts[id][room] = (unreadCounts[id][room] || 0) + 1;
    }
  });
}

// Auth: Sign up
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  const exists = await User.findOne({ $or: [{ username }, { email }] });
  if (exists) return res.status(409).json({ error: 'Username or email already exists' });
  const hash = await bcrypt.hash(password, 10);
  await User.create({ username, email, password: hash });
  return res.json({ success: true });
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
  return res.json({ token, username: user.username, email: user.email });
});

// User profile endpoint (JWT protected)
app.get('/api/profile', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ username: payload.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ username: user.username, email: user.email });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Add chat room endpoint (JWT protected)
app.post('/api/rooms', async (req, res) => {
  try {
    const { room } = req.body;
    if (!room) return res.status(400).json({ error: 'Invalid room' });
    const exists = await Room.findOne({ name: room });
    if (exists) return res.status(400).json({ error: 'Duplicate room' });
    await Room.create({ name: room });
    const allRooms = await Room.find().lean();
    return res.json({ success: true, rooms: allRooms.map(r => r.name) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Ensure default rooms exist in DB
async function ensureDefaultRooms() {
  const defaults = ['general', 'random', 'tech'];
  for (const name of defaults) {
    if (!(await Room.findOne({ name }))) {
      await Room.create({ name });
    }
  }
}
ensureDefaultRooms();

// Socket.io JWT authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.username = payload.username;
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Store user info
  users[socket.id] = { username: socket.username };
  unreadCounts[socket.id] = {};

  // Join room
  socket.on('join_room', async (data) => {
    const roomName = typeof data === 'string' ? data : data.room;
    socket.join(roomName);
    const user = users[socket.id];
    if (user) {
      // Emit to all users in the room except the joining user
      socket.to(roomName).emit('user_joined', { 
        username: user.username, 
        room: roomName 
      });
      
      try {
        // Send last 50 messages to the joining user
        const messages = await Message.find({ room: roomName })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();
        socket.emit('message_history', messages.reverse());
      } catch (error) {
        console.error('Error fetching messages:', error);
        socket.emit('error', { message: 'Error fetching message history' });
      }
    }
  });

  // Handle typing events
  socket.on('typing', ({ isTyping }) => {
    const user = users[socket.id];
    if (!user) return;

    // Get all rooms the socket is in
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    
    // Emit typing status to all rooms the user is in
    rooms.forEach(room => {
      if (isTyping) {
        socket.to(room).emit('typing_start', { username: user.username, room });
      } else {
        socket.to(room).emit('typing_stop', { username: user.username, room });
      }
    });
  });

  // Leave room
  socket.on('leave_room', (data) => {
    const roomName = typeof data === 'string' ? data : data.room;
    socket.leave(roomName);
    const user = users[socket.id];
    if (user) {
      io.to(roomName).emit('user_left', { 
        username: user.username, 
        room: roomName 
      });
    }
  });

  // Send message
  socket.on('send_message', async ({ room, message, isPrivate = false }, callback) => {
    const user = users[socket.id];
    if (!user) return;
    
    const messageDoc = new Message({
      sender: user.username,
      senderId: socket.id,
      room,
      message,
      timestamp: new Date(),
      isPrivate,
      reactions: {},
      readBy: [socket.id],
      file: null,
      image: null,
    });

    try {
      await messageDoc.save();
      incrementUnread(room, socket.id);
      if (!readReceipts[room]) readReceipts[room] = {};
      readReceipts[room][messageDoc._id] = [socket.id];
      
      // Emit the message to all users in the room
      io.to(room).emit('receive_message', messageDoc.toObject());
      if (callback) callback({ delivered: true, messageId: messageDoc._id });
    } catch (error) {
      console.error('Error saving message:', error);
      if (callback) callback({ delivered: false, error: 'Failed to save message' });
    }
  });

  // Mark message as read
  socket.on('read_message', ({ room, messageId }) => {
    if (!readReceipts[room]) readReceipts[room] = {};
    if (!readReceipts[room][messageId]) readReceipts[room][messageId] = [];
    if (!readReceipts[room][messageId].includes(socket.id)) {
      readReceipts[room][messageId].push(socket.id);
      io.to(room).emit('read_receipt', { messageId, userId: socket.id });
      unreadCounts[socket.id][room] = 0;
    }
  });

  // Add reaction
  socket.on('react_message', ({ room, messageId, reaction }) => {
    if (!reactions[messageId]) reactions[messageId] = {};
    reactions[messageId][socket.id] = reaction;
    io.to(room).emit('message_reaction', { messageId, userId: socket.id, reaction });
  });

  // File/image sharing (base64 or URL)
  socket.on('send_file', ({ room, file, filename }) => {
    const user = users[socket.id];
    if (!user) return;
    const message = {
      id: Date.now() + Math.random(),
      sender: user.username,
      senderId: socket.id,
      room,
      timestamp: new Date().toISOString(),
      file: { filename, data: file },
      message: '',
    };
    getRoomMessages(room).push(message);
    io.to(room).emit('receive_message', message);
  });

  // Pagination
  socket.on('fetch_messages', async ({ room, offset = 0, limit = 20 }, callback) => {
    const msgs = await Message.find({ room }).sort({ timestamp: 1 }).lean();
    const paged = msgs.slice(offset, offset + limit);
    if (callback) callback(paged);
  });

  // Message search
  socket.on('search_messages', async ({ room, query }, callback) => {
    const msgs = await Message.find({ room, message: { $regex: query, $options: 'i' } }).lean();
    if (callback) callback(msgs);
  });

  // Unread count
  socket.on('get_unread', ({ room }, callback) => {
    if (callback) callback(unreadCounts[socket.id]?.[room] || 0);
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      
      if (isTyping) {
        typingUsers[socket.id] = username;
      } else {
        delete typingUsers[socket.id];
      }
      
      io.emit('typing_users', Object.values(typingUsers));
    }
  });

  // Handle private messages
  socket.on('private_message', ({ to, message }) => {
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };
    
    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      io.emit('user_left', { username, id: socket.id });
      console.log(`${username} left the chat`);
    }
    
    delete users[socket.id];
    delete typingUsers[socket.id];
    
    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Socket.IO server ready`);
  console.log(`- API server ready`);
  console.log(`- MongoDB connected`);
});

// Export app, server, and io for testing
module.exports = { app, server, io };