import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import db from '../../../lib/db';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!session.user.is_approved && session.user.role !== 'admin') {
      return res.status(403).json({ message: 'Account not approved' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: 'Missing estimate ID' });
    }

    switch (req.method) {
      case 'GET':
        try {
          const estimate = await db.getEstimate(id);
          if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found' });
          }
          res.status(200).json(estimate);
        } catch (error) {
          console.error('Error fetching estimate:', error);
          res.status(500).json({ message: error.message || 'Error fetching estimate' });
        }
        break;

      case 'PUT':
        try {
          console.log('Updating estimate:', id, req.body);
          const result = await db.updateEstimate(id, req.body);
          if (!result) {
            return res.status(404).json({ message: 'Estimate not found' });
          }
          const updatedEstimate = await db.getEstimate(id);
          if (!updatedEstimate) {
            return res.status(404).json({ message: 'Updated estimate not found' });
          }
          res.status(200).json(updatedEstimate);
        } catch (error) {
          console.error('Error updating estimate:', error);
          res.status(500).json({ message: error.message || 'Error updating estimate' });
        }
        break;

      case 'DELETE':
        try {
          await db.deleteEstimate(id);
          res.status(200).json({ message: 'Estimate deleted successfully' });
        } catch (error) {
          console.error('Error deleting estimate:', error);
          res.status(500).json({ message: error.message || 'Error deleting estimate' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Unhandled error in API route:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
