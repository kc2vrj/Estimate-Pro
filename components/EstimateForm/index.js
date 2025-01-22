// components/EstimateForm/index.js
import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, Download, Save } from 'lucide-react';
import { useRouter } from 'next/router';

const EstimateForm = ({ initialData = null, readOnly = false, isEditing = false }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    number: '',
    po: '',
    salesRep: '',
    billToAddress: '',
    workShipAddress: '',
    scopeOfWork: '',
    exclusions: ''
  });

  const [rows, setRows] = useState([
    { id: 1, quantity: '', description: '', cost: '', price: '', total: '' }
  ]);

  const [totals, setTotals] = useState({
    subtotal: 0,
    salesTax: 0,
    total: 0
  });

  useEffect(() => {
    if (initialData) {
      const { id, created_at, updated_at, ...rest } = initialData;
      setFormData(rest);
      setRows(initialData.rows || []);
      if (initialData.totals) {
        setTotals(initialData.totals);
      }
    }
  }, [initialData]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        nav, header, .print-hide {
          display: none !important;
        }
        body {
          padding: 0 !important;
          margin: 0 !important;
        }
        .print-content {
          padding: 20px !important;
        }
        .print-break-inside-avoid {
          break-inside: avoid;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const generatePDF = () => {
    window.print();
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addRow = () => {
    const newRow = {
      id: rows.length + 1,
      quantity: '',
      description: '',
      cost: '',
      price: '',
      total: ''
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const calculatePrice = (cost) => {
    const markup = 1.35; // 35% markup
    return cost ? (Number(cost) * markup).toFixed(2) : '';
  };

  const updateRow = (id, field, value) => {
    const updatedRows = rows.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };

        // If cost is updated, automatically calculate price
        if (field === 'cost') {
          updatedRow.price = calculatePrice(value);
        }

        // Calculate total if we have both quantity and price
        if (field === 'quantity' || field === 'price' || field === 'cost') {
          const quantity = Number(updatedRow.quantity);
          const price = Number(updatedRow.price);
          if (!isNaN(quantity) && !isNaN(price)) {
            updatedRow.total = (quantity * price).toFixed(2);
          }
        }
        return updatedRow;
      }
      return row;
    });

    setRows(updatedRows);
    calculateTotals(updatedRows);
  };

  const calculateTotals = (currentRows) => {
    const subtotal = currentRows.reduce((sum, row) => {
      const total = Number(row.total) || 0;
      return sum + total;
    }, 0);
    const salesTax = 0;
    const total = subtotal + salesTax;

    setTotals({
      subtotal: subtotal.toFixed(2),
      salesTax: salesTax.toFixed(2),
      total: total.toFixed(2)
    });
  };

  const validateForm = () => {
    if (!formData.date) return 'Date is required';
    if (!formData.number) return 'Estimate number is required';
    if (!formData.salesRep) return 'Sales Rep is required';
    
    // Validate rows
    for (const row of rows) {
      if (!row.quantity || !row.description || !row.price) {
        return 'All line items must have quantity, description, and price';
      }
    }
    
    return null;
  };

  const saveEstimate = async () => {
    try {
      // Validate form
      const error = validateForm();
      if (error) {
        alert(error);
        return;
      }

      // Calculate final totals before saving
      calculateTotals(rows);

      // Prepare data
      const cleanedRows = rows.map(row => ({
        quantity: Number(row.quantity) || 0,
        description: row.description || '',
        cost: Number(row.cost) || 0,
        price: Number(row.price) || 0,
        total: Number(row.total) || 0
      }));

      const estimateData = {
        ...formData,
        rows: cleanedRows,
        subtotal: Number(totals.subtotal),
        salesTax: Number(totals.salesTax),
        total: Number(totals.total)
      };

      console.log('[Form] Saving estimate:', estimateData);

      const url = isEditing ? `/api/estimates/${initialData.id}` : '/api/estimates';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(estimateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save estimate');
      }

      const result = await response.json();
      console.log('[Form] Save result:', result);
      
      alert(isEditing ? 'Estimate updated successfully!' : 'Estimate saved successfully!');
      router.push('/estimates');
    } catch (error) {
      console.error('[Form] Error saving estimate:', error);
      alert(error.message || 'Error saving estimate');
    }
  };

  const autoResizeTextArea = (element) => {
    if (element) {
      element.style.height = 'auto';
      element.style.height = element.scrollHeight + 'px';
    }
  };

  const handleTextAreaChange = (field, value, event) => {
    updateFormData(field, value);
    autoResizeTextArea(event.target);
  };

  useEffect(() => {
    document.querySelectorAll('textarea').forEach(textarea => {
      autoResizeTextArea(textarea);
      textarea.addEventListener('input', () => autoResizeTextArea(textarea));
    });
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto p-6 print:p-2 bg-white print-content">
      {/* Print and Save Buttons */}
      <div className="flex justify-end gap-4 mb-6 print-hide">
        {!readOnly && (
          <button
            onClick={saveEstimate}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <Save size={20} />
            {isEditing ? 'Update' : 'Save'}
          </button>
        )}
        <button
          onClick={generatePDF}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <Download size={20} />
          {readOnly ? 'Print' : 'Save as PDF'}
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between mb-8 print:mb-4">
        <div className="w-1/2 flex items-start gap-4">
          <img
            src="/maytech-logo.jpg"
            alt="Maytech Systems Logo"
            className="w-auto h-16 print:h-12 object-contain max-w-[200px]"
          />
          <div>
            <h2 className="text-xl print:text-lg font-bold">Maytech Systems LLC.</h2>
            <p className="text-sm print:text-xs">
              153 Langsdale Rd<br />
              Columbia, SC 29212<br />
              Phone (919) 563-3431<br />
              Email: info@maytechsystems.com
            </p>
          </div>
        </div>
        <div className="w-1/2 text-right">
          <h1 className="text-2xl print:text-xl font-bold mb-4">ESTIMATE</h1>
          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <label className="font-semibold">Date:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => updateFormData('date', e.target.value)}
                disabled={readOnly}
                className="border rounded px-2 py-1 w-40 disabled:bg-gray-100 print:border-none"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <label className="font-semibold">Estimate #:</label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => updateFormData('number', e.target.value)}
                disabled={readOnly}
                className="border rounded px-2 py-1 w-40 disabled:bg-gray-100 print:border-none"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <label className="font-semibold">PO #:</label>
              <input
                type="text"
                value={formData.po}
                onChange={(e) => updateFormData('po', e.target.value)}
                disabled={readOnly}
                className="border rounded px-2 py-1 w-40 disabled:bg-gray-100 print:border-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <label className="font-semibold">Sales Rep:</label>
              <input
                type="text"
                value={formData.salesRep}
                onChange={(e) => updateFormData('salesRep', e.target.value)}
                disabled={readOnly}
                className="border rounded px-2 py-1 w-40 disabled:bg-gray-100 print:border-none"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div className="flex gap-4 print:gap-2 mb-6 print:mb-2 address-section">
        <div className="w-1/2">
          <h3 className="font-semibold mb-2 print:mb-1 print:text-sm">Bill To Address:</h3>
          <textarea
            className="w-full p-2 border rounded print:h-auto print:overflow-visible"
            value={formData.billToAddress}
            onChange={(e) => handleTextAreaChange('billToAddress', e.target.value, e)}
            readOnly={readOnly}
            rows={4}
          />
        </div>

        <div className="w-1/2">
          <h3 className="font-semibold mb-2 print:mb-1 print:text-sm">Work/Ship Address:</h3>
          <textarea
            className="w-full p-2 border rounded print:h-auto print:overflow-visible"
            value={formData.workShipAddress}
            onChange={(e) => handleTextAreaChange('workShipAddress', e.target.value, e)}
            readOnly={readOnly}
            rows={4}
          />
        </div>
      </div>

      {/* Scope Sections */}
      <div className="space-y-4 print:space-y-2 mb-6 print:mb-2 scope-section">
        <div>
          <h3 className="font-semibold mb-2 print:mb-1 print:text-sm">Scope of Work:</h3>
          <textarea
            className="w-full p-2 border rounded print:h-auto print:overflow-visible"
            value={formData.scopeOfWork}
            onChange={(e) => handleTextAreaChange('scopeOfWork', e.target.value, e)}
            readOnly={readOnly}
            rows={5}
          />
        </div>
        <div>
          <h3 className="font-semibold mb-2 print:mb-1 print:text-sm">Exclusions:</h3>
          <textarea
            className="w-full p-2 border rounded print:h-auto print:overflow-visible"
            value={formData.exclusions}
            onChange={(e) => handleTextAreaChange('exclusions', e.target.value, e)}
            readOnly={readOnly}
            rows={5}
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6 print:mb-2">
        <table className="w-full mb-4 print:mb-2 print:text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 print:p-1 border quantity-col">Quantity</th>
              <th className="text-left p-2 print:p-1 border description-col">Description</th>
              <th className="text-left p-2 print:p-1 border print:hidden">Cost</th>
              <th className="text-left p-2 print:p-1 border price-col">Price</th>
              <th className="text-left p-2 print:p-1 border total-col">Total</th>
              <th className="w-10 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-2 print:p-1 border quantity-col">
                  <input
                    type="number"
                    className="w-full p-1 border rounded print:border"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                    readOnly={readOnly}
                  />
                </td>
                <td className="p-2 print:p-1 border description-col">
                  <input
                    type="text"
                    className="w-full p-1 border rounded print:border"
                    value={row.description}
                    onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                    readOnly={readOnly}
                  />
                </td>
                <td className="p-2 print:p-1 border print:hidden">
                  <input
                    type="number"
                    className="w-full p-1 border rounded print:border"
                    value={row.cost}
                    onChange={(e) => updateRow(row.id, 'cost', e.target.value)}
                    placeholder="Our Cost"
                    readOnly={readOnly}
                  />
                </td>
                <td className="p-2 print:p-1 border price-col">
                  <input
                    type="number"
                    className="w-full p-1 border rounded print:border"
                    value={row.price}
                    onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                    readOnly={readOnly}
                  />
                </td>
                <td className="p-2 print:p-1 border total-col">
                  <input
                    value={row.total}
                    type="text"
                    className="w-full p-1 border rounded print:border"
                    readOnly
                  />
                </td>
                <td className="p-2 print:hidden">
                  {!readOnly && (
                    <button
                      onClick={() => removeRow(row.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <MinusCircle size={20} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add Row Button */}
        <div className="print:hidden">
          {!readOnly && (
            <button
              onClick={addRow}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <PlusCircle size={20} />
              Add Row
            </button>
          )}
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-6 print:mt-2">
          <div className="w-1/3 space-y-2 print:space-y-1 print:text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${totals.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Sales Tax (0%):</span>
              <span>${totals.salesTax}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>${totals.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div>
          <p className="font-semibold mb-2">Acceptance of Estimate:</p>
          <p>The above prices, specifications and conditions are satisfactory and are hereby accepted. You are authorized to do the work as specified.</p>
          
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-semibold">Signature: _______________________</p>
            </div>
            <div>
              <p className="font-semibold">Date: _________________________</p>
            </div>
          </div>
        </div>
        
        <div>
          <p className="font-semibold mb-2">Authorized by Maytech Systems LLC:</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-semibold">Signature: _______________________</p>
            </div>
            <div>
              <p className="font-semibold">Date: _________________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateForm;