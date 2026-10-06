import { Router } from 'express';
import { RiskEvent } from '../models/RiskEvent';

const router = Router();

// Get all cases pending expert review
router.get('/pending-cases', async (req, res) => {
  try {
    const cases = await RiskEvent.find({ status: 'PENDING_REVIEW' }).sort({ createdAt: -1 });
    res.json(cases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Expert decides on a case (APPROVE | MODIFY | REJECT | HOLD)
router.post('/review/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body; 
    
    if (!['APPROVED', 'MODIFIED', 'REJECTED', 'PENDING_REVIEW'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision state' });
    }

    const risk = await RiskEvent.findByIdAndUpdate(
      id, 
      { status: decision },
      { new: true }
    );

    if (!risk) {
      return res.status(404).json({ error: 'Risk event not found' });
    }

    // In a real system, if decision === 'APPROVED', we would trigger the Alert Engine here.
    
    res.json({ message: `Risk event ${decision}`, data: risk });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
