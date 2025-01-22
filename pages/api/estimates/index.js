import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import * as dbOperations from '../../../lib/db';

export default async function handler(req, res) {
  try {
    console.log('[API] Handling request:', req.method);
    console.log('[API] Headers:', req.headers);
    
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
          console.error('[API] Error stack:', error.stack);
          return res.status(500).json({ 
            error: 'Failed to fetch estimates',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        }

      case 'POST':
        try {
          console.log('[API] Creating new estimate:', req.body);
          const estimateId = await dbOperations.saveEstimate(req.body);
          console.log('[API] Created estimate with id:', estimateId);
          
          const newEstimate = await dbOperations.getEstimate(estimateId);
          console.log('[API] Retrieved new estimate:', newEstimate);
          
          return res.status(201).json(newEstimate);
        } catch (error) {
          console.error('[API] Error creating estimate:', error);
          console.error('[API] Error stack:', error.stack);
          return res.status(500).json({ 
            error: 'Failed to create estimate',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('[API] Unhandled error:', error);
    console.error('[API] Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
