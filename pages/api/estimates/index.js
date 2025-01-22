import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import db from '../../../lib/db';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (!session.user.is_approved && session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Account not approved' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const estimates = await db.getAllEstimates();
        res.status(200).json(estimates);
      } catch (error) {
        console.error('Error fetching estimates:', error);
        res.status(500).json({ message: 'Error fetching estimates' });
      }
      break;

    case 'POST':
      try {
        const estimateId = await db.saveEstimate(req.body);
        const newEstimate = await db.getEstimate(estimateId);
        res.status(201).json(newEstimate);
      } catch (error) {
        console.error('Error creating estimate:', error);
        res.status(500).json({ message: 'Error creating estimate' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
