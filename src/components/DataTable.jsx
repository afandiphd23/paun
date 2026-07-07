import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Printer, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function DataTable({ data }) {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'TARIKH FORMAT', direction: 'desc' });
  const rowsPerPage = 10;

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    // Filter
    const filtered = data.filter(item => {
      const searchStr = searchTerm.toLowerCase();
      return (
        (item['SYARIKAT']?.toString() || '').toLowerCase().includes(searchStr) ||
        (item['KOMPAUN REF NO ']?.toString() || '').toLowerCase().includes(searchStr) ||
        (item['SEKSYEN KESALAHAN']?.toString() || '').toLowerCase().includes(searchStr)
      );
    });

    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const currentData = filteredAndSortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '-';
    return `RM ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Compound Records', 14, 15);
    
    const tableColumn = ["Date", "Reference No", "Company", "Offense Section", "Amount (RM)", "Paid (RM)"];
    const tableRows = [];

    filteredAndSortedData.forEach(row => {
      const rowData = [
        formatDate(row['TARIKH FORMAT']),
        row['KOMPAUN REF NO '] || '-',
        row['SYARIKAT'] || '-',
        row['SEKSYEN KESALAHAN'] || '-',
        row['KOMPAUN AMT'] != null ? parseFloat(row['KOMPAUN AMT']).toFixed(2) : '-',
        row['KOMPAUN BAYAR'] != null ? parseFloat(row['KOMPAUN BAYAR']).toFixed(2) : '-'
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`kompaun_records_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1.125rem' }}>Compound Records</h3>
        
        <div style={{ display: 'flex', gap: '0.5rem', width: '400px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search company, ref no, or offense..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchTerm(inputValue);
                  setCurrentPage(1);
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'var(--transition)'
              }}
            />
          </div>
          <button 
            className="button-primary no-print"
            onClick={() => {
              setSearchTerm(inputValue);
              setCurrentPage(1);
            }}
            style={{ padding: '0.75rem 1.25rem' }}
          >
            Search
          </button>
          
          <button 
            className="button-secondary no-print"
            onClick={handlePrint}
            title="Print Dashboard"
            style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Printer size={20} />
          </button>
          
          <button 
            className="button-secondary no-print"
            onClick={handleExportPDF}
            title="Export Table to PDF"
            style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('TARIKH FORMAT')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Date <ArrowUpDown size={14} />
                </div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('KOMPAUN REF NO ')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Reference No <ArrowUpDown size={14} />
                </div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('SYARIKAT')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Company <ArrowUpDown size={14} />
                </div>
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('SEKSYEN KESALAHAN')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Offense Section <ArrowUpDown size={14} />
                </div>
              </th>
              <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('KOMPAUN AMT')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  Amount <ArrowUpDown size={14} />
                </div>
              </th>
              <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('KOMPAUN BAYAR')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  Paid <ArrowUpDown size={14} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row['TARIKH FORMAT'])}</td>
                  <td>{row['KOMPAUN REF NO '] || '-'}</td>
                  <td>{row['SYARIKAT'] || '-'}</td>
                  <td>{row['SEKSYEN KESALAHAN'] || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--accent-warning)' }}>
                    {formatCurrency(row['KOMPAUN AMT'])}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--accent-success)' }}>
                    {formatCurrency(row['KOMPAUN BAYAR'])}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No records found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Showing <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{filteredAndSortedData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}</span> to <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{Math.min(currentPage * rowsPerPage, filteredAndSortedData.length)}</span> of <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{filteredAndSortedData.length}</span> results
        </p>
        
        <div className="pagination">
          <button 
            className="pagination-btn" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          
          <span style={{ fontSize: '0.875rem', margin: '0 0.5rem' }}>
            Page {currentPage} of {totalPages || 1}
          </span>
          
          <button 
            className="pagination-btn" 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
