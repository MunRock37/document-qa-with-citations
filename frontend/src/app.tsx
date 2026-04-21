import { ChangeEvent, useEffect, useState, useCallback, useRef } from "react";
import { 
  askQuestion, 
  Citation, 
  deleteDocument, 
  DocumentItem, 
  fetchDocuments, 
  ingestDocument, 
  PaginatedDocuments,
  fetchDocumentText as apiFetchDocumentText
} from "./api";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import { 
  FileText, 
  AlertCircle, 
  Send, 
  Upload, 
  Trash2, 
  Eye, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Database,
  Sliders,
  X,
  Copy,
  Download,
  Check,
  MessageSquare,
  Inbox,
  FilePlus,
  ClipboardPaste
} from "lucide-react";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

interface ViewingDocument {
  id: number;
  name: string;
  text: string;
}

// Chat Message Component
const ChatMessage = ({ message, onCitationClick }: { 
  message: Message; 
  onCitationClick: (citation: Citation) => void;
}) => {
  return (
    <div className={`message message-${message.type}`}>
      <div className="message-avatar">
        {message.type === 'user' ? 'You' : 'AI'}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          {message.content}
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="message-citations">
            <div className="citations-header">Sources</div>
            <div className="citations-list">
              {message.citations.map((citation, idx) => (
                <button
                  key={`${citation.chunkId}-${idx}`}
                  className="citation-tag"
                  onClick={() => onCitationClick(citation)}
                >
                  <FileText size={12} />
                  <span>{citation.documentName}</span>
                  <span style={{ color: 'var(--color-gray-400)' }}>•</span>
                  <span>Chunk {citation.chunkIndex}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Document View Modal
const DocumentViewModal = ({ 
  isOpen, 
  onClose, 
  document: doc, 
  isLoading 
}: { 
  isOpen: boolean;
  onClose: () => void;
  document: ViewingDocument | null;
  isLoading: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !doc) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(doc.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([doc.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = window.document.createElement('a');
    a.href = url;
    a.download = doc.name;

    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FileText size={18} />
            <span>{doc.name}</span>
          </div>
          <div className="modal-actions">
            <button 
              className="btn-icon" 
              onClick={handleCopy} 
              disabled={isLoading}
              title="Copy content"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button 
              className="btn-icon" 
              onClick={handleDownload} 
              disabled={isLoading}
              title="Download"
            >
              <Download size={16} />
            </button>
            <button className="btn-icon" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="modal-body">
          {isLoading ? (
            <div className="loading-container">
              <Loader2 size={24} className="loading-spinner" />
            </div>
          ) : (
            doc.text
          )}
        </div>
      </div>
    </div>
  );
};

export function App() {
  const [docName, setDocName] = useState("");
  const [docText, setDocText] = useState("");
  const [paginatedDocuments, setPaginatedDocuments] = useState<PaginatedDocuments | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [topK, setTopK] = useState(4);
  const [loadingIngest, setLoadingIngest] = useState(false);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<ViewingDocument | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [showPasteForm, setShowPasteForm] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const documents = paginatedDocuments?.documents || [];
  const pagination = paginatedDocuments?.pagination;
  const hasDocs = documents.length > 0;
  const canAsk = hasDocs && question.trim().length > 0 && !loadingAsk;
  const canIngest = docName.trim().length > 0 && docText.trim().length > 0 && !loadingIngest;
  const canPasteIngest = pasteTitle.trim().length > 0 && pasteContent.trim().length > 0 && !loadingIngest;

  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadDocs(page: number = 1) {
    setLoadingDocs(true);
    try {
      const result = await fetchDocuments(page);
      setPaginatedDocuments(result);
      setCurrentPage(page);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoadingDocs(false);
    }
  }

  useEffect(() => {
    loadDocs().catch((e) => setError(String(e.message ?? e)));
  }, []);

  const handleIngest = useCallback(async () => {
    if (!canIngest) return;
    
    setError(null);
    setLoadingIngest(true);
    try {
      await ingestDocument({ name: docName.trim(), text: docText.trim() });
      setDocName("");
      setDocText("");
      setShowForm(false);
      await loadDocs(currentPage);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoadingIngest(false);
    }
  }, [docName, docText, currentPage, canIngest]);

  const handlePasteIngest = useCallback(async () => {
    if (!canPasteIngest) return;
    
    setError(null);
    setLoadingIngest(true);
    try {
      await ingestDocument({ name: pasteTitle.trim(), text: pasteContent.trim() });
      setPasteTitle("");
      setPasteContent("");
      setShowPasteForm(false);
      await loadDocs(currentPage);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoadingIngest(false);
    }
  }, [pasteTitle, pasteContent, currentPage, canPasteIngest]);

  const handleAsk = useCallback(async () => {
    if (!canAsk) return;
    
    setError(null);
    const userQuestion = question.trim();
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userQuestion,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQuestion("");
    setLoadingAsk(true);
    
    try {
      const result = await askQuestion({ question: userQuestion, topK });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.answer,
        citations: result.citations,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      const errorMessage = String((e as Error).message ?? e);
      setError(errorMessage);
      
      const errorAssistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorAssistantMessage]);
    } finally {
      setLoadingAsk(false);
    }
  }, [question, topK, canAsk]);

  const handleDeleteDocument = useCallback(async (documentId: number) => {
    setError(null);
    setDeletingDocumentId(documentId);
    try {
      await deleteDocument(documentId);
      await loadDocs(currentPage);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setDeletingDocumentId(null);
    }
  }, [currentPage]);

  const handleFileUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setDocName(file.name);

    const fileNameLower = file.name.toLowerCase();
    const isTxt = fileNameLower.endsWith(".txt") || file.type === "text/plain";
    const isPdf = fileNameLower.endsWith(".pdf") || file.type === "application/pdf";

    if (!isTxt && !isPdf) {
      setError("Only .txt and .pdf files are supported.");
      return;
    }

    try {
      if (isTxt) {
        const text = await file.text();
        setDocText(text);
        setShowForm(true);
        setShowPasteForm(false);
        return;
      }

      const data = await file.arrayBuffer();
      const pdf = await getDocument({ data }).promise;
      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const strings = content.items
          .map((item: any) => ("str" in item ? String(item.str) : ""))
          .filter(Boolean);
        pageTexts.push(strings.join(" "));
      }

      setDocText(pageTexts.join("\n\n"));
      setShowForm(true);
      setShowPasteForm(false);
    } catch (error) {
      console.error(error);
      setError("Failed to read uploaded file.");
    }
    
    event.target.value = '';
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPasteContent(text);
      setShowPasteForm(true);
      setShowForm(false);
      setTimeout(() => {
        if (pasteTextareaRef.current) {
          pasteTextareaRef.current.focus();
        }
      }, 100);
    } catch (error) {
      setError("Unable to read from clipboard. Please allow clipboard permissions.");
    }
  }, []);

  const handleViewDocument = useCallback(async (documentId: number, documentName: string) => {
    setLoadingText(true);
    setViewingDocument({ id: documentId, name: documentName, text: '' });
    
    try {
      const result = await apiFetchDocumentText(documentId);
      setViewingDocument({ id: documentId, name: documentName, text: result.text });
    } catch (error) {
      console.error('Failed to fetch document text:', error);
      setViewingDocument(null);
      setError('Failed to load document content.');
    } finally {
      setLoadingText(false);
    }
  }, []);

  const handleCitationClick = useCallback((citation: Citation) => {
    handleViewDocument(citation.documentId, citation.documentName);
  }, [handleViewDocument]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>
            <FileText size={24} />
            Document Q&A
          </h1>
          <p>Upload or paste documents and ask questions</p>
        </div>

        <div className="sidebar-content">
          {/* Upload Area */}
          <div className="upload-area">
            <div className="upload-actions">
              <label className="upload-trigger">
                <input
                  type="file"
                  accept=".txt,text/plain,.pdf,application/pdf"
                  onChange={handleFileUpload}
                />
                <Upload size={20} />
                <div className="upload-trigger-content">
                  <div className="upload-trigger-title">Upload Document</div>
                  <div className="upload-trigger-subtitle">PDF or TXT files</div>
                </div>
              </label>
              
              <button 
                className="paste-trigger"
                onClick={handlePasteFromClipboard}
              >
                <ClipboardPaste size={20} />
                <div className="upload-trigger-content">
                  <div className="upload-trigger-title">Paste Text</div>
                  <div className="upload-trigger-subtitle">From clipboard or type</div>
                </div>
              </button>
            </div>
          </div>

          {/* File Upload Form */}
          {showForm && (
            <div className="form-container">
              <div className="form-header">
                <FilePlus size={18} />
                <span>Upload Document</span>
              </div>
              <div className="form-group">
                <label className="form-label">Document Name</label>
                <input
                  className="form-input"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Enter document name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea
                  className="form-textarea"
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Document content..."
                />
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleIngest}
                  disabled={!canIngest}
                >
                  {loadingIngest ? (
                    <>
                      <Loader2 size={16} className="loading-spinner" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      Ingest Document
                    </>
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setDocName("");
                    setDocText("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Paste Text Form */}
          {showPasteForm && (
            <div className="form-container">
              <div className="form-header">
                <ClipboardPaste size={18} />
                <span>Paste Text Document</span>
              </div>
              <div className="form-group">
                <label className="form-label">Document Title</label>
                <input
                  className="form-input"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="Enter document title"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea
                  ref={pasteTextareaRef}
                  className="form-textarea paste-textarea"
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Paste or type your document content here..."
                />
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-primary btn-block"
                  onClick={handlePasteIngest}
                  disabled={!canPasteIngest}
                >
                  {loadingIngest ? (
                    <>
                      <Loader2 size={16} className="loading-spinner" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      Ingest Document
                    </>
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPasteForm(false);
                    setPasteTitle("");
                    setPasteContent("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Document List */}
          <div className="document-section">
            <div className="document-section-header">
              <span className="document-section-title">Your Documents</span>
              {pagination && (
                <span className="document-count">{pagination.totalCount} total</span>
              )}
            </div>

            {loadingDocs ? (
              <div className="loading-container">
                <Loader2 size={20} className="loading-spinner" />
              </div>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                <Inbox size={32} className="empty-state-icon" />
                <div className="empty-state-title">No documents</div>
                <div className="empty-state-description">Upload or paste a document to get started</div>
              </div>
            ) : (
              <>
                <div className="document-list">
                  {documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <div className="document-item-header">
                        <FileText size={18} className="document-item-icon" />
                        <div className="document-item-info">
                          <div className="document-item-name" title={doc.name}>
                            {doc.name}
                          </div>
                          <div className="document-item-meta">
                            <Calendar size={12} />
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="document-item-actions">
                        <button
                          className="btn-icon"
                          onClick={() => handleViewDocument(doc.id, doc.name)}
                          title="View document"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingDocumentId === doc.id}
                          title="Delete document"
                        >
                          {deletingDocumentId === doc.id ? (
                            <Loader2 size={14} className="loading-spinner" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => loadDocs(pagination.page - 1)}
                      disabled={!pagination.hasPrev || loadingDocs}
                    >
                      <ChevronLeft size={14} />
                      Prev
                    </button>
                    <span className="pagination-info">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => loadDocs(pagination.page + 1)}
                      disabled={!pagination.hasNext || loadingDocs}
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="btn-icon" onClick={() => setError(null)}>
              <X size={14} />
            </button>
          </div>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="chat-area">
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="chat-header-icon">
              <MessageSquare size={20} color="white" />
            </div>
            <div className="chat-header-text">
              <h3>Document Assistant</h3>
              <p>
                {hasDocs 
                  ? `${documents.length} document${documents.length !== 1 ? 's' : ''} available` 
                  : 'Upload or paste documents to start asking questions'}
              </p>
            </div>
          </div>
        </div>

        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={40} className="empty-state-icon" />
              <div className="empty-state-title">Start a conversation</div>
              <div className="empty-state-description">
                {hasDocs 
                  ? "Ask questions about your uploaded documents" 
                  : "Upload or paste documents first to enable Q&A"}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message}
                  onCitationClick={handleCitationClick}
                />
              ))}
              
              {loadingAsk && (
                <div className="message message-assistant">
                  <div className="message-avatar">AI</div>
                  <div className="message-content">
                    <div className="message-bubble">
                      <div className="loading-dots">
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="chat-footer">
          <div className="chat-input-container">
            <div className="chat-settings">
              <div className="setting-item">
                <span className="setting-label">
                  <Sliders size={14} />
                  Top-K Chunks
                </span>
                <input
                  type="range"
                  className="setting-slider"
                  min={1}
                  max={8}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  disabled={!hasDocs}
                />
                <span className="setting-value">{topK}</span>
              </div>
            </div>
            
            <div className="chat-input-wrapper">
              <textarea
                className="chat-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasDocs ? "Ask a question about your documents..." : "Upload or paste documents to start asking questions"}
                disabled={!hasDocs}
                rows={1}
              />
              <button
                className="chat-submit-btn"
                onClick={handleAsk}
                disabled={!canAsk}
                title="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Document View Modal */}
      <DocumentViewModal
        isOpen={viewingDocument !== null}
        onClose={() => setViewingDocument(null)}
        document={viewingDocument}
        isLoading={loadingText}
      />
    </div>
  );
}