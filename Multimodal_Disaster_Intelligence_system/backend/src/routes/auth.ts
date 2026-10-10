import { Router } from 'express';
import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { Recipient } from '../models/Recipient';
import { sendWelcomeEmail } from '../services/emailService';

const router = Router();

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, combinedHash: string): boolean {
  const [salt, storedHash] = combinedHash.split(':');
  if (!salt || !storedHash) return false;
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return testHash === storedHash;
}

// Initial demo users for instant testing
const DEMO_USERS = [
  {
    name: 'Harshwardhan Khairnar',
    email: 'hjkhairnar2104@gmail.com',
    password: 'password123',
    phone: '+91-9876543210',
    area: 'Kamrup',
    role: 'ADMIN',
  },
  {
    name: 'Priya Sharma (Kamrup Responder)',
    email: 'priya.sharma@disaster.assam.gov.in',
    password: 'password123',
    phone: '+91-9822012345',
    area: 'Kamrup',
    role: 'FIRST_RESPONDER',
  },
  {
    name: 'Rahul Borah (Guwahati Citizen)',
    email: 'rahul.borah@gmail.com',
    password: 'password123',
    phone: '+91-9864098765',
    area: 'Guwahati',
    role: 'CITIZEN',
  },
  {
    name: 'Anupam Barua (Tezpur Citizen)',
    email: 'anupam.barua@rediffmail.com',
    password: 'password123',
    phone: '+91-9435012345',
    area: 'Tezpur',
    role: 'CITIZEN',
  },
  {
    name: 'Dibrugarh Emergency Ops',
    email: 'ops.dibrugarh@ddma.gov.in',
    password: 'password123',
    phone: '+91-9706054321',
    area: 'Dibrugarh',
    role: 'DISPATCHER',
  },
];

async function ensureSeedUsers() {
  const count = await User.countDocuments();
  if (count === 0) {
    for (const u of DEMO_USERS) {
      const { salt, hash } = hashPassword(u.password);
      await User.create({
        name: u.name,
        email: u.email.toLowerCase(),
        passwordHash: `${salt}:${hash}`,
        phone: u.phone,
        area: u.area,
        role: u.role,
      });

      // Also ensure in Recipient collection
      await Recipient.findOneAndUpdate(
        { email: u.email.toLowerCase() },
        {
          name: u.name,
          phone: u.phone,
          email: u.email.toLowerCase(),
          district: u.area,
          emailEnabled: true,
          whatsappEnabled: true,
          isActive: true,
        },
        { upsert: true }
      );
    }
    console.log('[Auth] Seeded default users in MongoDB Atlas');
  }
}

// 1. SIGN UP
router.post('/signup', async (req, res) => {
  try {
    await ensureSeedUsers();
    const { name, email, password, area, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const { salt, hash } = hashPassword(password);
    const userRole = role || 'CITIZEN';
    const userArea = area || 'Kamrup';

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash: `${salt}:${hash}`,
      area: userArea,
      phone: phone || '',
      role: userRole,
    });

    // Also add to Recipient pool so they receive targeted disaster emails!
    await Recipient.findOneAndUpdate(
      { email: cleanEmail },
      {
        name: name.trim(),
        phone: phone || '+91-9000000000',
        email: cleanEmail,
        district: userArea,
        emailEnabled: true,
        whatsappEnabled: true,
        isActive: true,
      },
      { upsert: true }
    );

    const token = crypto.randomBytes(32).toString('hex');

    // Send immediate welcome & disaster alert subscription email
    sendWelcomeEmail({
      name: newUser.name,
      email: newUser.email,
      area: newUser.area,
      role: newUser.role,
    }).catch(e => console.error('[Auth] Failed to dispatch welcome email:', e));

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        area: newUser.area,
        role: newUser.role,
        phone: newUser.phone,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. SIGN IN / LOGIN
router.post('/login', async (req, res) => {
  try {
    await ensureSeedUsers();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        area: user.area,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET ALL USERS (BY AREA)
router.get('/users', async (req, res) => {
  try {
    await ensureSeedUsers();
    const { area } = req.query;
    const query: any = {};
    if (area && area !== 'ALL') {
      query.area = area;
    }

    const users = await User.find(query).select('-passwordHash').sort({ createdAt: -1 });
    res.json({ total: users.length, users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET CURRENT USER PROFILE
router.get('/me', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() }).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
