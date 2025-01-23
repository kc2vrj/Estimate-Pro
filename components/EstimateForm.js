import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export default function EstimateForm({ initialData, onSubmit, readOnly }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toLocaleDateString(),
    number: initialData?.number || '',
    po: initialData?.po || '',
    salesRep: initialData?.salesRep || session?.user?.name || 'Paul M. Nannery',
    billToAddress: initialData?.billToAddress || '',
    workShipAddress: initialData?.workShipAddress || '',
    scopeOfWork: initialData?.scopeOfWork || '',
    exclusions: initialData?.exclusions || 'M-F 8-5 Any item not on quote',
    salesTax: 0
  });

  const [items, setItems] = useState(initialData?.items || []);

  const handleInputChange = (e) => {
    if (readOnly) return;
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    if (readOnly) return;
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      total: field === 'quantity' || field === 'price' 
        ? Number(value) * (field === 'quantity' ? newItems[index].price : newItems[index].quantity)
        : newItems[index].total
    };
    setItems(newItems);
  };

  const addItem = () => {
    if (readOnly) return;
    setItems([...items, { id: Date.now(), quantity: 1, description: '', price: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    if (readOnly) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;

    try {
      setLoading(true);
      setError('');

      if (onSubmit) {
        onSubmit({ ...formData, items });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error.message || 'Error submitting form');
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + (item.total || 0), 0);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          margin: 0;
          size: letter;
        }
        body {
          margin: 0.5in !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print {
          display: none !important;
        }
        input, textarea {
          border: none !important;
          padding: 0 !important;
          background: transparent !important;
          min-height: unset !important;
          height: auto !important;
          overflow: visible !important;
          white-space: normal !important;
          line-height: inherit !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          page-break-inside: avoid !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
        th, td {
          border: 1px solid black !important;
          padding: 0.15in !important;
          line-height: 1.2 !important;
          vertical-align: top !important;
        }
        td input {
          width: 100% !important;
          min-width: unset !important;
          padding: 0 !important;
        }
        /* Hide browser headers and footers */
        @page :first {
          margin-top: 0;
        }
        @page :left {
          margin-left: 0;
        }
        @page :right {
          margin-right: 0;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="w-full bg-white">
      <div className="container mx-auto px-8 pt-0">
        {/* Header Section */}
        <div className="flex justify-between mb-8">
          <div className="flex gap-4">
            <div className="w-40">
              <Image
                src="/maytech-logo.jpg"
                alt="Logo"
                width={160}
                height={80}
                priority
              />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold">Maytech Systems LLC.</h2>
              <p>153 Langsdale Rd</p>
              <p>Columbia, SC 29212</p>
              <p>Phone: (919) 563-3431</p>
              <p>Email: info@maytechsystems.com</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold mb-4">ESTIMATE</h1>
            <div className="space-y-2">
              <div className="flex justify-end gap-2">
                <span className="font-semibold min-w-[80px] text-right">Date:</span>
                <input
                  type="text"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="text-right w-32 min-w-[128px]"
                  readOnly={readOnly}
                />
              </div>
              <div className="flex justify-end gap-2">
                <span className="font-semibold min-w-[80px] text-right">Estimate #:</span>
                <input
                  type="text"
                  value={formData.number}
                  onChange={handleInputChange}
                  className="text-right w-32 min-w-[128px]"
                  readOnly={readOnly}
                />
              </div>
              <div className="flex justify-end gap-2">
                <span className="font-semibold min-w-[80px] text-right">PO #:</span>
                <input
                  type="text"
                  value={formData.po}
                  onChange={handleInputChange}
                  className="text-right w-32 min-w-[128px]"
                  readOnly={readOnly}
                />
              </div>
              <div className="flex justify-end gap-2">
                <span className="font-semibold min-w-[80px] text-right">Sales Rep:</span>
                <input
                  type="text"
                  value={formData.salesRep}
                  onChange={handleInputChange}
                  className="text-right w-32 min-w-[128px]"
                  readOnly={readOnly}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="grid grid-cols-2 gap-12 mb-8">
          <div>
            <h3 className="font-semibold mb-2">Bill To Address:</h3>
            <textarea
              name="billToAddress"
              value={formData.billToAddress}
              onChange={handleInputChange}
              className="w-full border p-3 min-h-32"
              readOnly={readOnly}
            />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Work/Ship Address:</h3>
            <textarea
              name="workShipAddress"
              value={formData.workShipAddress}
              onChange={handleInputChange}
              className="w-full border p-3 min-h-32"
              readOnly={readOnly}
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
              onChange={handleInputChange}
              className="w-full border p-3 min-h-24"
              readOnly={readOnly}
            />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Exclusions:</h3>
            <textarea
              name="exclusions"
              value={formData.exclusions}
              onChange={handleInputChange}
              className="w-full border p-3 min-h-24"
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border">
              <th className="text-left p-3 w-24">Quantity</th>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3 w-32">Price</th>
              <th className="text-right p-3 w-32">Total</th>
              {!readOnly && <th className="w-16"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border">
                <td className="p-3">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full text-right"
                    readOnly={readOnly}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full min-h-[24px]"
                    readOnly={readOnly}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    className="w-full text-right"
                    readOnly={readOnly}
                  />
                </td>
                <td className="p-3 text-right">${item.total.toFixed(2)}</td>
                {!readOnly && (
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800 no-print"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!readOnly && (
          <div className="mb-8">
            <button
              type="button"
              onClick={addItem}
              className="text-blue-600 hover:text-blue-800"
            >
              + Add Item
            </button>
          </div>
        )}

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="text-right">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sales Tax ({formData.salesTax}%):</span>
              <span className="text-right">${(total * formData.salesTax / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-right">${(total + total * formData.salesTax / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-8 no-print">
          {!readOnly && (
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
          )}
          <button 
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ml-auto"
          >
            Print
          </button>
        </div>
      </div>
    </form>
  );
}
