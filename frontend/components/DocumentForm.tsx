import React, { ChangeEvent } from 'react';
import { FileText, Upload, Database, Loader2 } from 'lucide-react';

interface DocumentFormProps {
  docName: string;
  docText: string;
  loadingIngest: boolean;
  canIngest: boolean;
  onDocNameChange: (value: string) => void;
  onDocTextChange: (value: string) => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onIngest: () => void;
}

export const DocumentForm = React.memo(function DocumentForm({
  docName,
  docText,
  loadingIngest,
  canIngest,
  onDocNameChange,
  onDocTextChange,
  onFileUpload,
  onIngest
}: DocumentFormProps) {
  return (
    <section className="card">
      <h2>
        <Database size={20} />
        Add Document
      </h2>
      <label>
        <FileText size={16} style={{ marginRight: 8 }} />
        Document Name
        <input 
          value={docName} 
          onChange={(e) => onDocNameChange(e.target.value)} 
          placeholder="e.g. roadmap.txt" 
        />
      </label>
      <label>
        <Upload size={16} style={{ marginRight: 8 }} />
        Upload .txt (optional)
        <input type="file" accept=".txt,text/plain" onChange={onFileUpload} />
      </label>
      <label>
        <FileText size={16} style={{ marginRight: 8 }} />
        Document Text
        <textarea 
          value={docText} 
          onChange={(e) => onDocTextChange(e.target.value)} 
          rows={9} 
          placeholder="Paste your document content here or upload a file..."
        />
      </label>
      <button onClick={onIngest} disabled={!canIngest}>
        {loadingIngest ? (
          <>
            <Loader2 size={18} className="loading" />
            Ingesting...
          </>
        ) : (
          <>
            <Database size={18} />
            Ingest Document
          </>
        )}
      </button>
    </section>
  );
});
