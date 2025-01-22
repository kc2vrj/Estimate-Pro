const { saveEstimate, getAllEstimates, getEstimate, updateEstimate } = require('../../lib/db');

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'POST':
        try {
          const estimateData = {
            date: req.body.date || new Date().toISOString().split('T')[0],
            number: req.body.number || '',
            po: req.body.po || '',
            salesRep: req.body.salesRep || '',
            billToAddress: req.body.billToAddress || '',
            workShipAddress: req.body.workShipAddress || '',
            scopeOfWork: req.body.scopeOfWork || '',
            exclusions: req.body.exclusions || '',
            subtotal: req.body.totals?.subtotal || 0,
            salesTax: req.body.totals?.salesTax || 0,
            total: req.body.totals?.total || 0,
            rows: req.body.rows || []
          };

          const id = saveEstimate(estimateData);
          res.status(200).json({ success: true, id });
        } catch (error) {
          console.error('Error saving estimate:', error);
          res.status(500).json({ error: 'Failed to save estimate', details: error.message });
        }
        break;

      case 'PUT':
        try {
          const { id } = req.query;
          if (!id) {
            res.status(400).json({ error: 'Missing estimate ID' });
            return;
          }

          const estimateData = {
            date: req.body.date || new Date().toISOString().split('T')[0],
            number: req.body.number || '',
            po: req.body.po || '',
            salesRep: req.body.salesRep || '',
            billToAddress: req.body.billToAddress || '',
            workShipAddress: req.body.workShipAddress || '',
            scopeOfWork: req.body.scopeOfWork || '',
            exclusions: req.body.exclusions || '',
            subtotal: req.body.totals?.subtotal || 0,
            salesTax: req.body.totals?.salesTax || 0,
            total: req.body.totals?.total || 0,
            rows: req.body.rows || []
          };

          const updatedId = updateEstimate(id, estimateData);
          res.status(200).json({ success: true, id: updatedId });
        } catch (error) {
          console.error('Error updating estimate:', error);
          res.status(500).json({ error: 'Failed to update estimate', details: error.message });
        }
        break;
        
      case 'GET':
        const { id: estimateId } = req.query;
        if (estimateId) {
          const estimate = getEstimate(estimateId);
          if (!estimate) {
            res.status(404).json({ error: 'Estimate not found' });
            return;
          }
          res.status(200).json(estimate);
        } else {
          const estimates = getAllEstimates();
          res.status(200).json(estimates);
        }
        break;
        
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
