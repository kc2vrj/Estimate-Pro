import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbOperations from '../../../lib/db';

export default async function handler(req, res) {
  try {
    console.log('[API] Handling request:', req.method);
    
    const session = await getServerSession(req, res, authOptions);
    console.log('[API] Session:', session);

    if (!session) {
      console.log('[API] No session found');
      return res.status(401).json({ error: 'You must be logged in.' });
    }

    if (!session.user.is_approved && session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Account not approved' });
    }

    switch (req.method) {
      case 'GET':
        try {
          console.log('[API] Getting all estimates');
          const estimates = await dbOperations.getAllEstimates();
          console.log('[API] Retrieved estimates:', estimates?.length);
          return res.status(200).json(estimates || []);
        } catch (error) {
          console.error('[API] Error fetching estimates:', error);
          return res.status(500).json({ error: 'Failed to fetch estimates' });
        }

      case 'POST':
        try {
          const estimate = req.body;
          console.log('[API] Creating new estimate:', estimate);

          // Ensure required fields
          if (!estimate.number) {
            return res.status(400).json({ error: 'Estimate number is required' });
          }

          const estimateId = await dbOperations.saveEstimate(estimate);
          console.log('[API] Created estimate with id:', estimateId);
          
          const newEstimate = await dbOperations.getEstimate(estimateId);
          console.log('[API] Retrieved new estimate:', newEstimate);
          
          return res.status(201).json(newEstimate);
        } catch (error) {
          console.error('[API] Error creating estimate:', error);
          return res.status(500).json({ error: 'Failed to create estimate' });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('[API] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
