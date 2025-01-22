import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import User from '../../../models/User';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const users = await User.getAllPendingUsers();
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
