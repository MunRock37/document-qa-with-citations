import React from 'react';
import { Citation } from '../api';
import { FileText, Target, TrendingUp, Quote } from 'lucide-react';

interface CitationListProps {
  citations: Citation[];
}

export const CitationList = React.memo(function CitationList({ citations }: CitationListProps) {
  if (citations.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '24px', 
        color: '#6b7280',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '2px dashed #e5e7eb'
      }}>
        <Quote size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
        <p style={{ margin: 0, fontWeight: 500 }}>No citations yet</p>
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>Ask a question to see relevant citations</p>
      </div>
    );
  }

  return (
    <ul style={{ gap: '16px' }}>
      {citations.map((c, index) => (
        <li key={c.chunkId} style={{ 
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '4px', 
            height: '100%', 
            background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
            opacity: 0.8
          }} />
          <div style={{ marginLeft: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} color="#667eea" />
                <strong style={{ color: '#374151' }}>{c.documentName}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={14} color="#6b7280" />
                <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  Chunk {c.chunkIndex}
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                background: c.score > 0.8 ? '#dcfce7' : c.score > 0.6 ? '#fef3c7' : '#fee2e2',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: c.score > 0.8 ? '#166534' : c.score > 0.6 ? '#92400e' : '#991b1b'
              }}>
                <TrendingUp size={12} />
                {c.score.toFixed(3)}
              </div>
            </div>
            <div style={{ 
              background: '#fff',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              borderLeft: '3px solid #667eea'
            }}>
              <p className="excerpt" style={{ margin: 0, lineHeight: 1.6 }}>
                {c.excerpt}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
});
