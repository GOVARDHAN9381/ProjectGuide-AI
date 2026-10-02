// ═══════════════════════════════════════════════════════
// AGRI VISION — RAG Service (Frontend → Vector Server)
// Used by rag/gemini_server.js (server-side Node.js only).
// Queries the local ChromaDB Vector Server for semantic
// chunk retrieval, then builds the RAG prompt for Gemini.
// ═══════════════════════════════════════════════════════

import http from 'http'

const VECTOR_SERVER_URL = process.env.VECTOR_SERVER_URL || 'http://127.0.0.1:8001'
const VECTOR_SERVER_TIMEOUT_MS = 4000

const LANG_NAMES = {
  en: 'English', hi: 'Hindi', ta: 'Tamil',
  te: 'Telugu',  mr: 'Marathi', kn: 'Kannada',
}

// ──────────────────────────────────────────────────────
// Internal HTTP helper (Node.js native, no extra deps)
// ──────────────────────────────────────────────────────

function httpPost(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const opts = {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: VECTOR_SERVER_TIMEOUT_MS,
    }

    const parsed = new URL(url)
    opts.hostname = parsed.hostname
    opts.port     = parsed.port || 80
    opts.path     = parsed.pathname

    const req = http.request(opts, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end',  () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: null })
        }
      })
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Vector server request timed out'))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ──────────────────────────────────────────────────────
// Build the RAG prompt injected into Gemini / Ollama
// ──────────────────────────────────────────────────────

function buildRAGPrompt(query, retrievedChunks, langName = 'English', context = {}) {
  let prompt = `You are Krishi Saarthi, an expert Indian agricultural AI assistant. `
             + `ALWAYS respond directly in ${langName}.\n`
             + `Be concise, practical, and helpful (under 150 words). `
             + `Do not show internal thinking tags or reasoning processes.\n\n`

  // Inject context fields (weather, location, soil, etc.)
  const ctxParts = []
  if (context.location) ctxParts.push(`Location: ${context.location}`)
  if (context.weather)  ctxParts.push(`Weather: ${context.weather}`)
  if (context.crops)    ctxParts.push(`Crops: ${context.crops}`)
  if (context.soil)     ctxParts.push(`Soil: ${context.soil}`)
  if (context.season)   ctxParts.push(`Season: ${context.season}`)
  if (ctxParts.length)  prompt += `FARMER CONTEXT:\n${ctxParts.join('\n')}\n\n`

  if (retrievedChunks && retrievedChunks.length > 0) {
    prompt += `RETRIEVED AGRICULTURAL KNOWLEDGE:\n`
    retrievedChunks.forEach((c, idx) => {
      const num = idx + 1
      prompt += `[Context ${num} | Source: ${c.source} | Category: ${c.category} | Topic: ${c.topic}]\n`
      prompt += `${c.text}\n\n`
    })
    prompt += `INSTRUCTIONS:\n`
    prompt += `- Use the RETRIEVED AGRICULTURAL KNOWLEDGE above as your primary source.\n`
    prompt += `- Avoid inventing unsupported agricultural facts.\n`
    prompt += `- If the context is insufficient, acknowledge what is known and recommend consulting a local KVK officer.\n`
    prompt += `- Do not present uncertain information as certain.\n\n`
  } else {
    prompt += `NO DIRECT KNOWLEDGE BASE MATCH FOUND FOR THIS QUERY.\n`
    prompt += `INSTRUCTIONS:\n`
    prompt += `- Inform the farmer that specific local records were not found.\n`
    prompt += `- Provide general safe farming guidance and advise consulting a local KVK agricultural officer.\n\n`
  }

  prompt += `FARMER QUESTION: ${query}\n`
  prompt += `ANSWER IN ${langName.toUpperCase()}:`

  return prompt
}

// ──────────────────────────────────────────────────────
// Public API: processRAGQuery
// Returns: { retrieved_chunks, has_context, rag_prompt, retrieval_mode }
// ──────────────────────────────────────────────────────

export async function processRAGQuery(query, language = 'en', context = {}) {
  const langName = LANG_NAMES[language] || 'English'
  let retrievedChunks = []
  let retrievalMode   = 'none'

  // ── Step 1: Try the local ChromaDB Vector Server ──────────────────────────
  try {
    const response = await httpPost(`${VECTOR_SERVER_URL}/api/retrieve`, {
      query,
      top_k:     4,
      threshold: 0.30,
    })

    if (response.status === 200 && response.body?.retrieved_chunks?.length > 0) {
      retrievedChunks = response.body.retrieved_chunks
      retrievalMode   = 'chromadb_semantic'
      console.log(`[RAG Service] ChromaDB returned ${retrievedChunks.length} semantic chunks`)
    } else {
      console.log(`[RAG Service] ChromaDB returned no results (status ${response.status})`)
    }
  } catch (err) {
    console.warn(`[RAG Service] ChromaDB vector server unavailable: ${err.message}`)
  }

  // ── Step 2: Fallback — direct SQLite keyword scan via vector server ────────
  // (The vector server's /api/retrieve already handles this internally via
  //  the retriever's SQLite fallback, so nothing extra is needed here.)

  const hasContext  = retrievedChunks.length > 0
  const ragPrompt   = buildRAGPrompt(query, retrievedChunks, langName, context)

  return {
    retrieved_chunks: retrievedChunks,
    has_context:      hasContext,
    rag_prompt:       ragPrompt,
    retrieval_mode:   retrievalMode,
  }
}
