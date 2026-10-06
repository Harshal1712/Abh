import { Router } from 'express';
import { Recipient } from '../models/Recipient';

const router = Router();

// Get all recipients
router.get('/', async (req, res) => {
  try {
    const recipients = await Recipient.find().sort({ createdAt: -1 });
    res.json(recipients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get active recipient count
router.get('/count', async (req, res) => {
  try {
    const count = await Recipient.countDocuments({ isActive: true });
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add new recipient
router.post('/', async (req, res) => {
  try {
    const newRecipient = new Recipient(req.body);
    const saved = await newRecipient.save();
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update recipient
router.put('/:id', async (req, res) => {
  try {
    const updated = await Recipient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete recipient
router.delete('/:id', async (req, res) => {
  try {
    await Recipient.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
