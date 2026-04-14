import React, { useState } from 'react';
import { DocumentItem, fetchDocumentText } from '.././src/api';
import { FileText, Trash2, Loader2, Calendar, Eye } from 'lucide-react';
import { DocumentViewModal } from './DocumentViewModal';

interface DocumentListProps {
  documents: DocumentItem[];
  onDeleteDocument: (documentId: number) => void;
  deletingDocumentId: number | null;
}

export const DocumentList = React.memo(function DocumentList({
  documents,
  onDeleteDocument,
  deletingDocumentId
}: DocumentListProps) {
  const [viewingDocument, setViewingDocument] = useState<{
    id: number;
    name: string;
    text: string;
  } | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const handleViewDocument = async (documentId: number, documentName: string) => {
    setLoadingText(true);
    setViewingDocument({ id: documentId, name: documentName, text: '' });
    
    try {
      const result = await fetchDocumentText(documentId);
      setViewingDocument({ id: documentId, name: documentName, text: result.text });
    } catch (error) {
      console.error('Failed to fetch document text:', error);
      setViewingDocument(null);
    } finally {
      setLoadingText(false);
    }
  };

  const handleCloseModal = () => {
    setViewingDocument(null);
  };

  if (documents.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '32px', 
        color: '#6b7280',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '2px dashed #e5e7eb'
      }}>
        <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
        <p style={{ margin: 0, fontWeight: 500 }}>No documents yet</p>
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>Add a text document to enable Q&A</p>
      </div>
    );
  }

  return (
    <>
      <ul>
        {documents.map((d) => (
          <li key={d.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <FileText size={20} color="#667eea" />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>{d.name}</strong>
                <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} />
                  {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleViewDocument(d.id, d.name)}
                disabled={loadingText}
                style={{ 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
                title="View document"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => onDeleteDocument(d.id)}
                disabled={deletingDocumentId === d.id}
              >
                {deletingDocumentId === d.id ? (
                  <>
                    <Loader2 size={16} className="loading" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                  </>
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <DocumentViewModal
        isOpen={viewingDocument !== null}
        onClose={handleCloseModal}
        documentName={viewingDocument?.name || ''}
        documentText={viewingDocument?.text || ''}
        isLoading={loadingText}
      />
    </>
  );
});
