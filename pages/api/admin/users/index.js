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

  switch (req.method) {
    case 'GET':
      try {
        const users = await User.getAllUsers();
        res.status(200).json({ users });
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
      }
      break;

    case 'POST':
      try {
        const { email, password, name, role, is_approved } = req.body;
        if (!email || !password || !name) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        const userId = await User.create({ email, password, name, role, is_approved });
        const newUser = await User.findById(userId);
        res.status(201).json(newUser);
      } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
