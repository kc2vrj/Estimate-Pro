import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import Quote from '../../../models/Quote';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      const deleted = await Quote.delete(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Quote not found' });
      }
      
      return res.status(200).json({ message: 'Quote deleted successfully' });
    } catch (error) {
      console.error('Error deleting quote:', error);
      return res.status(500).json({ error: 'Error deleting quote' });
    }
  }

  // Handle other methods
  res.setHeader('Allow', ['DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
