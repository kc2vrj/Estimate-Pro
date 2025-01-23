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
    console.log('[API] Estimate ID:', id);

    if (!id) {
      return res.status(400).json({ message: 'Missing estimate ID' });
    }

    switch (req.method) {
      case 'GET':
        try {
          console.log('[API] Getting estimate from database');
          const estimate = await db.getEstimate(id);
          console.log('[API] Database response:', estimate);

          if (!estimate) {
            return res.status(404).json({ message: 'Estimate not found' });
          }

          // Ensure all required fields are present
          const formattedEstimate = {
            id: estimate.id,
            number: estimate.number,
            date: estimate.date,
            po: estimate.po || '',
            customer_name: estimate.customer_name || '',
            customer_email: estimate.customer_email || '',
            customer_phone: estimate.customer_phone || '',
            salesRep: estimate.salesRep || '',
            billToAddress: estimate.billToAddress || '',
            workShipAddress: estimate.workShipAddress || '',
            scopeOfWork: estimate.scopeOfWork || '',
            exclusions: estimate.exclusions || '',
            salesTax: estimate.salesTax || 0,
            total_amount: estimate.total_amount || 0,
            items: estimate.items ? estimate.items.map(item => ({
              id: item.id,
              quantity: item.quantity,
              description: item.description,
              price: item.price,
              total: item.total
            })) : []
          };

          console.log('[API] Formatted estimate:', formattedEstimate);
          res.status(200).json(formattedEstimate);
        } catch (error) {
          console.error('[API] Error fetching estimate:', error);
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
          console.log('Deleting estimate:', id);
          const result = await db.deleteEstimate(id);
          if (!result || result.changes === 0) {
            return res.status(404).json({ message: 'Estimate not found' });
          }
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
