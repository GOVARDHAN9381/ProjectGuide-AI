// ═══════════════════════════════════════════════════════
// AGRI VISION — Secure Gemini API + ChromaDB Vector RAG Server
// Server-Side Node.js execution. API key is NEVER sent to browser.
// ═══════════════════════════════════════════════════════

import http from 'http'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import { processRAGQuery } from '../src/services/rag/ragService.js'

dotenv.config()

const PORT = process.env.GEMINI_SERVER_PORT || 8002
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Initialize Google GenAI SDK if API key is present
let ai = null
let isApiKeyConfigured = false

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
  try {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    isApiKeyConfigured = true
    console.log(`[Gemini Server] SDK Initialized successfully with model: '${GEMINI_MODEL}'`)
  } catch (err) {
    console.error(`[Gemini Server] GenAI SDK Initialization Error: ${err.message}`)
  }
} else {
  console.warn(`[Gemini Server] WARNING: GEMINI_API_KEY is not set in .env file. Running in RAG Knowledge Fallback mode.`)
}

/**
 * Format fallback response directly from retrieved RAG context when Gemini API Key is missing or rate limited
 */
function synthesizeRAGFallback(ragResult, lang = 'en') {
  if (!ragResult.has_context || !ragResult.retrieved_chunks || ragResult.retrieved_chunks.length === 0) {
    return "🌾 **Krishi Saarthi Advice**:\nNo direct matching local knowledge records were found for this query. Please consult your local Krishi Vigyan Kendra (KVK) officer for field inspection."
  }

  const chunks = ragResult.retrieved_chunks
  let text = `🌾 **Krishi Saarthi Advice** (Retrieved from ChromaDB Vector Knowledge Base):\n\n`
  chunks.forEach((c, idx) => {
    text += `**${idx + 1}. ${c.topic}**\n${c.text}\n\n`
  })
  return text.trim()
}

/**
 * Handle HTTP Requests
 */
async function handleRequest(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  // Health check endpoint
  if (req.method === 'GET' && ['/', '/health', '/api/health'].includes(url.pathname)) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'READY',
      service: 'Agrisight Gemini RAG Server',
      model: GEMINI_MODEL,
      api_key_configured: isApiKeyConfigured,
    }))
    return
  }

  // Chat endpoint
  if (req.method === 'POST' && ['/chat', '/api/chat', '/api/gemini/chat'].includes(url.pathname)) {
    let bodyText = ''
    req.on('data', chunk => { bodyText += chunk })
    req.on('end', async () => {
      let body = {}
      try {
        body = JSON.parse(bodyText || '{}')
      } catch {
        body = {}
      }

      const message = body.message || body.query || ''
      const language = body.language || 'en'
      const context = body.context || {}

      if (!message.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Message parameter required' }))
        return
      }

      console.log(`[Gemini Server] Request received for question: "${message.substring(0, 60)}..." (Lang: ${language})`)

      try {
        // Step 1: Run ChromaDB Vector Search RAG Pipeline
        const ragResult = await processRAGQuery(message, language, context)
        console.log(`[Gemini Server] RAG Retrieval complete: ${ragResult.retrieved_chunks.length} chunks retrieved (Mode: ${ragResult.retrieval_mode})`)

        let finalReply = null
        let provider = 'local_rag'

        // Step 2: Query Gemini API if configured
        if (isApiKeyConfigured && ai) {
          try {
            console.log(`[Gemini Server] Sending prompt to Gemini API (${GEMINI_MODEL})...`)
            const response = await ai.models.generateContent({
              model: GEMINI_MODEL,
              contents: ragResult.rag_prompt,
            })

            if (response && response.text) {
              finalReply = response.text.trim()
              provider = 'gemini_api'
              console.log(`[Gemini Server] Successfully received response from Gemini API (${finalReply.length} chars)`)
            }
          } catch (geminiErr) {
            console.error(`[Gemini Server] Gemini API call failed: ${geminiErr.message}. Falling back to local RAG knowledge synthesis.`)
          }
        }

        // Step 3: Fallback synthesis if Gemini API key not present or call failed
        if (!finalReply) {
          finalReply = synthesizeRAGFallback(ragResult, language)
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({
          reply: finalReply,
          model: isApiKeyConfigured ? GEMINI_MODEL : `${GEMINI_MODEL} (Local RAG Mode)`,
          retrieved_chunks: ragResult.retrieved_chunks || [],
          has_context: ragResult.has_context || false,
          retrieval_mode: ragResult.retrieval_mode,
          provider,
        }))

      } catch (err) {
        console.error(`[Gemini Server] Server Error: ${err.message}`)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          error: 'AI service temporarily unavailable. Please try again.',
          details: err.message,
        }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Endpoint not found' }))
}

const server = http.createServer(handleRequest)
server.listen(PORT, '127.0.0.1', () => {
  console.log(`==================================================`)
  console.log(`  AGRISIGHT GEMINI API RAG SERVER STARTED`)
  console.log(`  Listening on http://127.0.0.1:${PORT}/`)
  console.log(`  Configured Model: ${GEMINI_MODEL}`)
  console.log(`  API Key Configured: ${isApiKeyConfigured ? 'YES (Secure Server Environment)' : 'NO (Add GEMINI_API_KEY to .env)'}`)
  console.log(`==================================================`)
})
