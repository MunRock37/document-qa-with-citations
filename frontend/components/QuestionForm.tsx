import React from 'react';
import { MessageCircle, Settings, Loader2, Send } from 'lucide-react';

interface QuestionFormProps {
  question: string;
  topK: number;
  hasDocs: boolean;
  loadingAsk: boolean;
  canAsk: boolean;
  onQuestionChange: (value: string) => void;
  onTopKChange: (value: number) => void;
  onAsk: () => void;
}

export const QuestionForm = React.memo(function QuestionForm({
  question,
  topK,
  hasDocs,
  loadingAsk,
  canAsk,
  onQuestionChange,
  onTopKChange,
  onAsk
}: QuestionFormProps) {
  return (
    <section className="card">
      <h2>
        <MessageCircle size={20} />
        Ask Question
      </h2>
      <label>
        <MessageCircle size={16} style={{ marginRight: 8 }} />
        Question
        <input 
          value={question} 
          onChange={(e) => onQuestionChange(e.target.value)} 
          placeholder="What were the Q3 priorities?" 
          disabled={!hasDocs}
        />
      </label>
      <label>
        <Settings size={16} style={{ marginRight: 8 }} />
        Top-K Chunks
        <input
          type="number"
          min={1}
          max={8}
          value={topK}
          onChange={(e) => onTopKChange(Number(e.target.value))}
          disabled={!hasDocs}
        />
      </label>
      <button onClick={onAsk} disabled={!canAsk}>
        {loadingAsk ? (
          <>
            <Loader2 size={18} className="loading" />
            Generating answer...
          </>
        ) : (
          <>
            <Send size={18} />
            Ask
          </>
        )}
      </button>
      {!hasDocs && (
        <p style={{ 
          margin: '12px 0 0', 
          fontSize: '0.9rem', 
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          Add documents first to enable Q&A
        </p>
      )}
    </section>
  );
});
