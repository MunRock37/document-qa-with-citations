import React, { useState } from 'react';
import { X, FileText, Copy, Download, Check } from 'lucide-react';

interface DocumentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  documentText: string;
  isLoading: boolean;
}

export const DocumentViewModal = React.memo(function DocumentViewModal({
  isOpen,
  onClose,
  documentName,
  documentText,
  isLoading
}: DocumentViewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(documentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([documentText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = documentName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <FileText size={24} color="#667eea" />
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1f2937' }}>
              {documentName}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopy}
              disabled={isLoading}
              style={{
                padding: '8px 12px',
                border: copied ? '1px solid #22c55e' : '1px solid #d1d5db',
                borderRadius: '8px',
                background: copied ? '#dcfce7' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: copied ? '#166534' : '#374151',
                transition: 'all 0.2s ease'
              }}
              title={copied ? "Copied!" : "Copy text"}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: '#374151'
              }}
              title="Download as text file"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: '#374151'
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          flex: 1,
          overflow: 'auto'
        }}>
          {isLoading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '200px',
              gap: '12px',
              color: '#6b7280'
            }}>
              <div className="loading" style={{ width: '20px', height: '20px', border: '2px solid #e5e7eb', borderTop: '2px solid #667eea', borderRadius: '50%' }}></div>
              Loading document...
            </div>
          ) : (
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '15px',
              color: '#374151',
              maxHeight: '60vh',
              overflow: 'auto'
            }}>
              {documentText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
