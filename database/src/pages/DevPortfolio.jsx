import React from 'react'

export default function DevPortfolio() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Developer Portfolio — RAG & Vector Stack</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="text-sm text-muted">This page documents and demonstrates the local RAG stack used by AgriSight: Qdrant vector DB, the Python RAG retriever/ingest tools (in /rag and /ai-service), and the Trace AI microservice (trace-service) which records every model call for observability.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold">Running the stack (local)</h2>
        <ol className="list-decimal list-inside text-sm">
          <li>Install Docker and Docker Compose.</li>
          <li>Open a terminal at the repository root and run:
            <pre className="mt-2 bg-[var(--color-canvas)] p-2 rounded">docker-compose up --build qdrant trace-service ai-service</pre>
          </li>
          <li>The ai-service will ingest bundled knowledge into Qdrant and then exit. The trace-service will remain running on port 8001.</li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold">Key endpoints</h2>
        <ul className="list-disc list-inside text-sm">
          <li>Qdrant REST API: <a href="http://localhost:6333" target="_blank" rel="noreferrer" className="text-accent">http://localhost:6333</a></li>
          <li>Trace UI (live dashboard): <a href="http://localhost:8001/traces-ui" target="_blank" rel="noreferrer" className="text-accent">http://localhost:8001/traces-ui</a></li>
          <li>RAG retriever (Python helpers): see <code>rag/retriever.py</code> and <code>rag/ingest.py</code></li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold">How it fits together</h2>
        <p className="text-sm">The typical flow is:</p>
        <ol className="list-decimal list-inside text-sm">
          <li>ai-service reads knowledge files and creates embeddings (local or external embedding provider).</li>
          <li>Vectors are uploaded to Qdrant.</li>
          <li>When a user queries advisory/chat, the RAG retriever queries Qdrant and returns top chunks to the LLM.</li>
          <li>The PHP backend or Python service records the full request/response to the Trace service for observability.</li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <ul className="list-disc list-inside text-sm">
          <li>Hook Trace events into front-end usage analytics to show per-user traces.</li>
          <li>Add an "ingest new docs" UI that POSTs files to ai-service (or a new ingest endpoint).</li>
          <li>Swap embedding provider or enable Trace Commons AI model telemetry where applicable.</li>
        </ul>
      </section>

      <div className="mt-8 text-sm text-muted">Made for developer demos — links open in a new tab.</div>
    </div>
  )
}
