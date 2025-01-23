import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import * as dbOperations from '../../../lib/db';

export default async function handler(req, res) {
  console.log('[API] Handling next-number request');
  
  try {
    const session = await getServerSession(req, res, authOptions);
    console.log('[API] Session:', session);

    if (!session) {
      console.log('[API] No session found');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!session.user.is_approved && session.user.role !== 'admin') {
      console.log('[API] User not approved:', session.user);
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.method !== 'GET') {
      console.log('[API] Invalid method:', req.method);
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Get the year from query or use current year
    const year = parseInt(req.query.year) || new Date().getFullYear();
    console.log('[API] Year:', year);

    // Get the latest estimate number for this year
    const nextNumber = await dbOperations.getLatestEstimateNumber(year);
    console.log('[API] Next number:', nextNumber);

    return res.status(200).json({ number: nextNumber });
  } catch (error) {
    console.error('[API] Error generating next number:', error);
    return res.status(500).json({ message: 'Error generating estimate number', error: error.message });
  }
}
