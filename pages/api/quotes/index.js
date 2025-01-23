import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import Quote from '../../../models/Quote';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    try {
      const quotes = await Quote.findAll();
      return res.status(200).json(quotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      return res.status(500).json({ error: 'Error fetching quotes' });
    }
  }

  if (req.method === 'POST') {
    try {
      const quote = await Quote.create({
        ...req.body,
        user_id: session.user.id
      });
      return res.status(201).json(quote);
    } catch (error) {
      console.error('Error creating quote:', error);
      return res.status(500).json({ error: 'Error creating quote' });
    }
  }

  // Handle other methods
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
