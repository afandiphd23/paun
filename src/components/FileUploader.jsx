import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import * as xlsx from 'xlsx';

export default function FileUploader({ onDataLoaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file) => {
    if (!file) return;
    
    // Quick validation
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setError('Please upload a valid Excel or CSV file.');
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });

      if (jsonData.length === 0) {
        setError('The selected file appears to be empty.');
        setIsLoading(false);
        return;
      }

      onDataLoaded(jsonData);
    } catch (err) {
      console.error(err);
      setError('Failed to parse the file. Ensure it is a valid Kompaun Excel format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
      <div 
        className={`glass-panel ${isDragging ? 'dragging' : ''}`}
        style={{ 
          padding: '4rem 2rem', 
          borderStyle: isDragging ? 'dashed' : 'solid',
          borderColor: isDragging ? 'var(--accent-primary)' : 'var(--border-color)',
          transition: 'all 0.3s ease'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            width: '80px', height: '80px', 
            borderRadius: '50%', 
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <FileSpreadsheet size={40} color="var(--accent-primary)" />
          </div>
        </div>
        
        <h2 style={{ marginBottom: '1rem' }}>Upload Kompaun Data</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Drag and drop your <span className="text-gradient" style={{ fontWeight: 600 }}>kompaun.xlsx</span> file here, or click to browse.
          The data will be processed instantly and securely in your browser.
        </p>

        {error && (
          <div style={{ color: 'var(--accent-danger)', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        <label className="button-primary" style={{ cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
          {isLoading ? (
            'Processing...'
          ) : (
            <>
              <UploadCloud size={20} />
              Browse Files
            </>
          )}
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            disabled={isLoading}
          />
        </label>
      </div>
    </div>
  );
}
