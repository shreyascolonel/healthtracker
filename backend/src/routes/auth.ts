import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const users = await query<{ id: string; password_hash: string; name: string; email: string }>(
    'SELECT id, password_hash, name, email FROM users WHERE email = $1',
    [email]
  );

  if (users.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '365d' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { userId: string };
    const users = await query<{ id: string; name: string; email: string }>(
      'SELECT id, name, email FROM users WHERE id = $1',
      [payload.userId]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: users[0] });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
