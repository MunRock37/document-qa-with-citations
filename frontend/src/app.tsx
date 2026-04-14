export function App() {
  return (
    <main style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Document Q&A</h1>

      {/* Document Upload Section */}
      <section style={{ marginBottom: "20px" }}>
        <h2>Upload Document</h2>
        <input type="text" placeholder="Document name" />
        <br /><br />
        <textarea placeholder="Paste document text here..." rows={5} cols={50} />
        <br /><br />
        <button>Ingest</button>
      </section>

      {/* Question Section */}
      <section style={{ marginBottom: "20px" }}>
        <h2>Ask Question</h2>
        <input type="text" placeholder="Enter your question..." />
        <br /><br />
        <button>Ask</button>
      </section>

      {/* Answer Section */}
      <section style={{ marginBottom: "20px" }}>
        <h2>Answer</h2>
        <p>No answer yet...</p>
      </section>

      {/* Citations Section */}
      <section>
        <h2>Citations</h2>
        <p>No citations yet...</p>
      </section>
    </main>
  );
}