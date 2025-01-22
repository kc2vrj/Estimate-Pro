import React, { useState, useEffect } from 'react';
import { Eye, Printer, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { useRouter } from 'next/router';

const EstimatesList = () => {
  const [estimates, setEstimates] = useState([]);
  const [filteredEstimates, setFilteredEstimates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const router = useRouter();

  useEffect(() => {
    fetchEstimates();
  }, []);

  useEffect(() => {
    filterEstimates();
  }, [searchTerm, estimates]);

  const fetchEstimates = async () => {
    try {
      const response = await fetch('/api/estimates');
      if (!response.ok) throw new Error('Failed to fetch estimates');
      const data = await response.json();
      setEstimates(data);
      setFilteredEstimates(data);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      alert('Error loading estimates');
    }
  };

  const filterEstimates = () => {
    const filtered = estimates.filter(estimate => {
      const searchString = searchTerm.toLowerCase();
      return (
        estimate.number?.toLowerCase().includes(searchString) ||
        estimate.billToAddress?.toLowerCase().includes(searchString) ||
        estimate.workShipAddress?.toLowerCase().includes(searchString) ||
        estimate.po?.toLowerCase().includes(searchString)
      );
    });
    setFilteredEstimates(sortEstimates(filtered));
  };

  const sortEstimates = (data) => {
    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Handle date comparison
      if (sortConfig.key === 'date') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }
      // Handle numeric comparison
      else if (sortConfig.key === 'total') {
        aValue = Number(aValue || 0);
        bValue = Number(bValue || 0);
      }
      // Handle string comparison
      else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    setFilteredEstimates(sortEstimates(filteredEstimates));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const viewEstimate = (id) => {
    router.push(`/estimates/${id}`);
  };

  const printEstimate = (id) => {
    window.open(`/estimates/${id}?print=true`, '_blank');
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Saved Estimates</h1>
        
        {/* Search and Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Search estimates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          
          <button
            onClick={() => router.push('/estimates/new')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Estimate
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Estimates</h3>
            <p className="text-2xl font-semibold text-gray-900">{estimates.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">This Month</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {estimates.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(estimates.reduce((sum, e) => sum + (Number(e.total) || 0), 0))}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average Value</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(estimates.length ? estimates.reduce((sum, e) => sum + (Number(e.total) || 0), 0) / estimates.length : 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Estimates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left cursor-pointer group"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date {getSortIcon('date')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left cursor-pointer group"
                  onClick={() => handleSort('number')}
                >
                  <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimate # {getSortIcon('number')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left cursor-pointer group"
                  onClick={() => handleSort('billToAddress')}
                >
                  <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client {getSortIcon('billToAddress')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left cursor-pointer group"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total {getSortIcon('total')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEstimates.map((estimate) => (
                <tr key={estimate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(estimate.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {estimate.number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {estimate.billToAddress?.split('\n')[0]}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(estimate.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => viewEstimate(estimate.id)}
                      className="text-blue-600 hover:text-blue-900 mx-2"
                      title="View Estimate"
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      onClick={() => printEstimate(estimate.id)}
                      className="text-green-600 hover:text-green-900 mx-2"
                      title="Print Estimate"
                    >
                      <Printer size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEstimates.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'No estimates found matching your search' : 'No estimates yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EstimatesList;
