import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export default function EstimateForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    number: '',  // Will be fetched
    po: '',
    salesRep: session?.user?.name || '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    billToAddress: '',
    workShipAddress: '',
    scopeOfWork: '',
    exclusions: 'M-F 8-5\nAny item not on quote',
    salesTax: 0
  });

  const [items, setItems] = useState([
    { id: 1, quantity: 1, description: '', cost: 0, price: 0, total: 0 }
  ]);

  // Fetch next estimate number when component mounts
  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        const year = new Date().getFullYear();
        const response = await fetch(`/api/estimates/next-number?year=${year}`);
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            number: data.nextNumber
          }));
        }
      } catch (error) {
        console.error('Error fetching next estimate number:', error);
      }
    };

    fetchNextNumber();
  }, []);

  // Update salesRep when session changes
  useEffect(() => {
    if (session?.user?.name) {
      setFormData(prev => ({
        ...prev,
        salesRep: session.user.name
      }));
    }
  }, [session]);

  useEffect(() => {
    // Add print styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        .no-print {
          display: none !important;
        }
        .cost-column {
          display: none !important;
        }
        input, textarea {
          border: none !important;
          padding: 0 !important;
          background: none !important;
        }
        .print-break-after {
          page-break-after: always;
        }
        @page {
          margin: 0.5in;
          size: portrait;
        }
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        /* Hide browser's default header/footer */
        @page { margin: 0.5in }
        @page :first { margin-top: 0 }
        @page :left { margin-left: 0 }
        @page :right { margin-right: 0 }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculatePrice = (cost) => {
    return parseFloat((cost * 1.35).toFixed(2));
  };

  const addItem = () => {
    const newId = Math.max(...items.map(item => item.id), 0) + 1;
    setItems([...items, { id: newId, quantity: 1, description: '', cost: 0, price: 0, total: 0 }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {  // Prevent removing last item
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updates = { ...item, [field]: value };
        if (field === 'cost') {
          updates.price = calculatePrice(value);
        }
        updates.total = updates.quantity * updates.price;
        return updates;
      }
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: items.map(({ id, cost, ...item }) => item), // Remove cost from saved data
          total_amount: total,
          userId: session?.user?.id
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create estimate');
      }

      router.push('/estimates');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white p-8">
      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between mb-8">
        <div className="flex gap-4">
          <img src="/maytech-logo.jpg" alt="Logo" className="h-16 w-auto" />
          <div>
            <h2 className="text-xl font-bold">Maytech Systems LLC.</h2>
            <p className="text-sm">
              153 Langsdale Rd<br />
              Columbia, SC 29212<br />
              Phone (919) 563-3431<br />
              Email: info@maytechsystems.com
            </p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold mb-4">ESTIMATE</h1>
          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <span className="font-semibold">Estimate #:</span>
              <input
                type="text"
                name="number"
                value={formData.number}
                onChange={handleFormChange}
                className="border-b border-gray-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <span className="font-semibold">PO #:</span>
              <input
                type="text"
                name="po"
                value={formData.po}
                onChange={handleFormChange}
                className="border-b border-gray-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <span className="font-semibold">Sales Rep:</span>
              <input
                type="text"
                name="salesRep"
                value={formData.salesRep}
                onChange={handleFormChange}
                className="border-b border-gray-300 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold mb-2">Bill To Address:</h3>
          <textarea
            name="billToAddress"
            value={formData.billToAddress}
            onChange={handleFormChange}
            rows={4}
            className="w-full border p-3 min-h-32 focus:border-blue-500 focus:outline-none rounded"
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Work/Ship Address:</h3>
          <textarea
            name="workShipAddress"
            value={formData.workShipAddress}
            onChange={handleFormChange}
            rows={4}
            className="w-full border p-3 min-h-32 focus:border-blue-500 focus:outline-none rounded"
          />
        </div>
      </div>

      {/* Scope and Exclusions */}
      <div className="space-y-6 mb-8">
        <div>
          <h3 className="font-semibold mb-2">Scope of Work:</h3>
          <textarea
            name="scopeOfWork"
            value={formData.scopeOfWork}
            onChange={handleFormChange}
            rows={3}
            className="w-full border p-3 min-h-24 focus:border-blue-500 focus:outline-none rounded"
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2">Exclusions:</h3>
          <textarea
            name="exclusions"
            value={formData.exclusions}
            onChange={handleFormChange}
            rows={3}
            className="w-full border p-3 min-h-24 focus:border-blue-500 focus:outline-none rounded"
          />
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border">
            <th className="text-left p-2 w-24">Quantity</th>
            <th className="text-left p-2">Description</th>
            <th className="text-left p-2 w-24 cost-column">Cost</th>
            <th className="text-left p-2 w-24">Price</th>
            <th className="text-left p-2 w-24">Total</th>
            <th className="w-20 no-print"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border">
              <td className="p-2">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value))}
                  className="w-full border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                />
              </td>
              <td className="p-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  className="w-full border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                />
              </td>
              <td className="p-2 cost-column">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.cost}
                  onChange={(e) => updateItem(item.id, 'cost', parseFloat(e.target.value))}
                  className="w-full border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                />
              </td>
              <td className="p-2">${item.price.toFixed(2)}</td>
              <td className="p-2">${item.total.toFixed(2)}</td>
              <td className="p-2 no-print">
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={addItem}
        className="mb-8 text-blue-600 hover:text-blue-800 no-print"
      >
        + Add Item
      </button>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-48 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Sales Tax ({formData.salesTax}%):</span>
            <span>${(total * (formData.salesTax / 100)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>${(total * (1 + formData.salesTax / 100)).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between mt-8 no-print">
        <button 
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          <Download className="w-4 h-4" />
          Print
        </button>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push('/estimates')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? 'Saving...' : 'Save Estimate'}
          </button>
        </div>
      </div>
    </form>
  );
}
