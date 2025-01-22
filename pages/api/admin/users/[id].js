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

  const { id } = req.query;

  switch (req.method) {
    case 'PUT':
      try {
        const { name, email, role, is_approved } = req.body;
        if (!name || !email) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        await User.updateUser(id, { name, email, role, is_approved });
        const updatedUser = await User.findById(id);
        res.status(200).json(updatedUser);
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
      }
      break;

    case 'DELETE':
      try {
        await User.deleteUser(id);
        res.status(204).end();
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
      }
      break;

    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
