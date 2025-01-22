import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import User from '../../../../models/User';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Missing user ID' });
  }

  try {
    await User.approveUser(id);
    res.status(200).json({ message: 'User approved successfully' });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
