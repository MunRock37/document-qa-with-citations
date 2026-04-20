import { ChangeEvent, useEffect, useMemo, useState, useCallback } from "react";
import { askQuestion, Citation, deleteDocument, DocumentItem, fetchDocuments, ingestDocument, PaginatedDocuments } from "./api";
import { useDebounce } from "../hooks/useDebounce"
import { DocumentList } from "../components/DocumentList";
import { CitationList } from "../components/CitationList";
import { DocumentForm } from "../components/DocumentForm";
import { QuestionForm } from "../components/QuestionForm";
import { Brain, FileText, AlertCircle, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
 
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function App() {
  const [docName, setDocName] = useState("");
  const [docText, setDocText] = useState("");
  const [paginatedDocuments, setPaginatedDocuments] = useState<PaginatedDocuments | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [question, setQuestion] = useState("");
  const debouncedQuestion = useDebounce(question, 500);
  const [answer, setAnswer] = useState("");
  const [citations, setcitations] = useState<Citation[]>([]);
  const [topK, setTopK] = useState(4);
  const [loadingIngest, setLoadingIngest] = useState(false);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const documents = paginatedDocuments?.documents || [];
  const pagination = paginatedDocuments?.pagination;

  const hasDocs = documents.length > 0;
  const canIngest = docName.trim().length > 0 && docText.trim().length > 0 && !loadingIngest;
  const canAsk = hasDocs && question.trim().length > 0 && !loadingAsk;

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
    setError(null);
    setLoadingIngest(true);
    try {
      await ingestDocument({ name: docName.trim(), text: docText.trim() });
      setDocName("");
      setDocText("");
      await loadDocs(currentPage);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoadingIngest(false);
    }
  }, [docName, docText, currentPage]);

  const handleAsk = useCallback(async () => {
    setError(null);
    setLoadingAsk(true);
    setAnswer("");
    setcitations([]);
    try {
      const result = await askQuestion({ question: question.trim(), topK });
      setAnswer(result.answer);
      setcitations(result.citations);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoadingAsk(false);
    }
  }, [question, topK]);

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
    setError("Only .txt and .pdf files are supported in this MVP.");
    return;
  }

  try {
    if (isTxt) {
      const text = await file.text();
      setDocText(text);
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
  } catch (error) {
    console.error(error);
    setError("Failed to read uploaded file.");
  }
}, []);

  return (
    <main className="container">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <Brain size={48} color="white" />
          <h1 style={{ margin: 0 }}>Document Q&A with Citations</h1>
        </div>
        <p className="hint">
          Upload or paste text, then ask grounded questions against your local corpus.
        </p>
      </div>

      <div className="layout-grid layout-grid--top">
        <DocumentForm
          docName={docName}
          docText={docText}
          loadingIngest={loadingIngest}
          canIngest={canIngest}
          onDocNameChange={setDocName}
          onDocTextChange={setDocText}
          onFileUpload={handleFileUpload}
          onIngest={handleIngest}
        />

        <QuestionForm
          question={question}
          topK={topK}
          hasDocs={hasDocs}
          loadingAsk={loadingAsk}
          canAsk={canAsk}
          onQuestionChange={setQuestion}
          onTopKChange={setTopK}
          onAsk={handleAsk}
        />
      </div>

      <section className="card">
        <h2 className='card-header-title'>
          <FileText size={20} />
          Documents
          {pagination && (
            <span style={{
              fontSize: '0.9rem',
              fontWeight: 'normal',
              color: '#6b7280',
              marginLeft: 'auto'
            }}>
              {pagination.totalCount} total
            </span>
          )}
        </h2>
        <div className='card-body'>
          <DocumentList
            documents={documents}
            onDeleteDocument={handleDeleteDocument}
            deletingDocumentId={deletingDocumentId}
          />

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => loadDocs(pagination.page - 1)}
                disabled={!pagination.hasPrev || loadingDocs}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: pagination.hasPrev && !loadingDocs ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  color: pagination.hasPrev ? '#374151' : '#9ca3af',
                  minWidth: '60px'
                }}
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              <span style={{
                fontSize: '14px',
                color: '#374151',
                fontWeight: 500,
                padding: '6px 12px',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                onClick={() => loadDocs(pagination.page + 1)}
                disabled={!pagination.hasNext || loadingDocs}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: pagination.hasNext && !loadingDocs ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  color: pagination.hasNext ? '#374151' : '#9ca3af',
                  minWidth: '60px'
                }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="layout-grid layout-grid--bottom">
        <section className="card">
          <h2 className='card-header-title'>
            <MessageSquare size={20} />
            Answer
          </h2>
          <div className='card-body'>
            <div style={{
              background: answer ? '#f0f9ff' : '#f9fafb',
              border: `1px solid ${answer ? '#0ea5e9' : '#e5e7eb'}`,
              borderRadius: '12px',
              padding: '16px',
              minHeight: '80px',
              display: 'flex',
              alignItems: 'center',
              color: answer ? '#0c4a6e' : '#6b7280',
              fontStyle: answer ? 'normal' : 'italic'
            }}>
              {answer || "No answer yet. Ask a question to get started."}
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className='card-header-title'>
            <FileText size={20} />
            Citations
          </h2>
          <div className='card-body'>
            <CitationList citations={citations} />
          </div>
        </section>
      </div>
    </main>
  );
}
