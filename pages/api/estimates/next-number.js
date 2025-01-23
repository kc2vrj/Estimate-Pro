import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import db from '../../../lib/db';

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

    // Get the current year
    const currentYear = new Date().getFullYear();
    console.log('[API] Current year:', currentYear);

    // Get the latest estimate number for this year
    const latestEstimate = await db.getLatestEstimateNumber(currentYear);
    console.log('[API] Latest estimate:', latestEstimate);
    
    // Generate next number
    let nextNumber;
    if (!latestEstimate) {
      // First estimate of the year
      nextNumber = `${currentYear}-001`;
      console.log('[API] First estimate of the year:', nextNumber);
    } else {
      // Extract the sequence number and increment it
      const match = latestEstimate.match(/\d+$/);
      if (!match) {
        nextNumber = `${currentYear}-001`;
        console.log('[API] Invalid format, starting from 001:', nextNumber);
      } else {
        const sequence = parseInt(match[0], 10) + 1;
        nextNumber = `${currentYear}-${sequence.toString().padStart(3, '0')}`;
        console.log('[API] Next number in sequence:', nextNumber);
      }
    }

    console.log('[API] Sending response:', { nextNumber });
    res.status(200).json({ nextNumber });
  } catch (error) {
    console.error('[API] Error:', error);
    console.error('[API] Stack:', error.stack);
    res.status(500).json({ message: error.message || 'Error getting next estimate number' });
  }
}
