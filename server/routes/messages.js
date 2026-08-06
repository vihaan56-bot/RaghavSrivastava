import express from 'express';
import { getMessages, saveMessages } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Post a contact message (Public)
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All contact fields are required.' });
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  try {
    const messages = await getMessages();
    const newMsg = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString()
    };

    messages.push(newMsg);
    await saveMessages(messages);

    return res.status(201).json({ message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Error saving contact message:', error);
    return res.status(500).json({ message: error.message || 'Internal server error while sending message.' });
  }
});

// Get all contact messages (Protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const messages = await getMessages();
    // Return sorted newest first
    const sortedMessages = [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(sortedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ message: error.message || 'Error retrieving messages.' });
  }
});

// Delete a message (Protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const messages = await getMessages();
    const filtered = messages.filter(m => m.id !== id);

    if (messages.length === filtered.length) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    await saveMessages(filtered);
    return res.json({ message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ message: error.message || 'Error deleting message.' });
  }
});

export default router;
