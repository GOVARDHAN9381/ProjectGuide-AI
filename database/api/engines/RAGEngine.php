<?php
// ═══════════════════════════════════════════════════════
// AGRI VISION — RAG Engine (Retrieval-Augmented Generation)
// Phase 1: Local Knowledge Base + Keyword/Text Retrieval
// ═══════════════════════════════════════════════════════

class RAGEngine {

    private static $instance = null;
    private $chunks = [];
    private $isLoaded = false;

    private $stopWords = [
        'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
        'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'could', 'did',
        'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
        'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
        'is', 'it', 'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
        'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
        'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
        'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
        'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'tell', 'give', 'please'
    ];

    private $synonyms = [
        'yellow' => ['yellowing', 'chlorosis', 'pale'],
        'yellowing' => ['yellow', 'chlorosis', 'pale'],
        'paddy' => ['rice'],
        'rice' => ['paddy'],
        'water' => ['irrigation', 'watering', 'irrigated'],
        'irrigation' => ['water', 'watering', 'irrigated'],
        'ph' => ['acidic', 'alkaline', 'soil ph'],
        'fertilizer' => ['fertilizers', 'npk', 'urea', 'dap', 'nutrient'],
        'disease' => ['diseases', 'blight', 'spot', 'rot', 'infection'],
        'pest' => ['pests', 'borer', 'whitefly', 'hopper', 'insect']
    ];

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->loadKnowledgeBase();
    }

    /**
     * Recursively scan knowledge directory and parse documents into chunks
     */
    public function loadKnowledgeBase($forceReload = false) {
        if ($this->isLoaded && !$forceReload) {
            return $this->chunks;
        }

        $this->chunks = [];
        $dir = defined('RAG_KNOWLEDGE_DIR') ? RAG_KNOWLEDGE_DIR : __DIR__ . '/../../knowledge';

        if (!is_dir($dir)) {
            error_log("[RAG Engine] Knowledge directory not found: {$dir}");
            return [];
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile() && in_array(strtolower($file->getExtension()), ['md', 'txt'])) {
                $filePath = $file->getPathname();
                $content = file_get_contents($filePath);
                if ($content) {
                    $docChunks = $this->chunkDocument($filePath, $content);
                    $this->chunks = array_merge($this->chunks, $docChunks);
                }
            }
        }

        $this->isLoaded = true;
        return $this->chunks;
    }

    /**
     * Chunk document by section headers (## or #)
     */
    private function chunkDocument($filePath, $content) {
        $category = $this->inferCategory($filePath);
        $crop = $this->inferCrop($filePath, $content);
        $chunks = [];

        $sections = preg_split('/(?=\n#{1,3}\s)/', $content);
        $chunkIndex = 0;

        foreach ($sections as $section) {
            $trimmed = trim($section);
            if (empty($trimmed)) continue;

            $topic = 'General';
            if (preg_match('/^#{1,3}\s+(.+)$/m', $trimmed, $matches)) {
                $topic = trim($matches[1]);
            }

            $text = preg_replace('/^#{1,3}\s+.+$/m', '', $trimmed);
            $text = trim($text) ?: $trimmed;

            if (strlen($text) < 20) continue;

            $chunkIndex++;
            $relPath = str_replace('\\', '/', str_replace(realpath($filePath), $filePath, $filePath));
            $cleanSource = preg_replace('#^.*/knowledge/#', 'knowledge/', $relPath);

            $chunks[] = [
                'id' => "{$cleanSource}#chunk_{$chunkIndex}",
                'source' => $cleanSource,
                'category' => $category,
                'crop' => $crop,
                'topic' => $topic,
                'text' => ($topic !== 'General' ? "{$topic}: " : "") . $text,
            ];
        }

        return $chunks;
    }

    private function inferCategory($filePath) {
        $normalized = str_replace('\\', '/', strtolower($filePath));
        $categories = ['crops', 'diseases', 'soil', 'fertilizers', 'irrigation', 'pests', 'government'];
        foreach ($categories as $cat) {
            if (strpos($normalized, "/{$cat}/") !== false) {
                return $cat;
            }
        }
        return 'general';
    }

    private function inferCrop($filePath, $content) {
        $pathLower = strtolower($filePath);
        $contentLower = strtolower($content);

        if (strpos($pathLower, 'rice') !== false || strpos($contentLower, 'rice cultivation') !== false) {
            return 'rice';
        }
        if (strpos($pathLower, 'tomato') !== false || strpos($contentLower, 'tomato cultivation') !== false) {
            return 'tomato';
        }
        return 'general';
    }

    /**
     * Normalize question and extract keywords
     */
    public function normalizeQuery($query) {
        $clean = preg_replace('/[^a-z0-9\s]/', ' ', strtolower($query));
        $tokens = array_filter(explode(' ', $clean), fn($t) => strlen($t) > 1);

        $keywords = [];
        foreach ($tokens as $token) {
            if (!in_array($token, $this->stopWords)) {
                $keywords[] = $token;
                if (isset($this->synonyms[$token])) {
                    $keywords = array_merge($keywords, $this->synonyms[$token]);
                }
            }
        }

        return [
            'raw' => $query,
            'normalized' => $clean,
            'keywords' => array_values(array_unique($keywords))
        ];
    }

    /**
     * Score a single chunk against normalized query
     */
    public function scoreChunk($chunk, $queryInfo, $metaIntent) {
        $score = 0;
        $chunkTextLower = strtolower($chunk['text']);
        $topicLower = strtolower($chunk['topic'] ?? '');

        $matchedKeywordCount = 0;
        foreach ($queryInfo['keywords'] as $kw) {
            if (strpos($chunkTextLower, $kw) !== false) {
                $matchedKeywordCount++;
                $score += 0.5;
                if (in_array($kw, ['nitrogen', 'ph', 'blight', 'chlorosis', 'irrigation', 'pm-kisan', 'pmfby'])) {
                    $score += 0.5;
                }
            }
        }

        if ($matchedKeywordCount === 0) return 0;

        foreach ($queryInfo['keywords'] as $kw) {
            if (strpos($topicLower, $kw) !== false) {
                $score += 2.0;
                break;
            }
        }

        if ($metaIntent['crop'] && $chunk['crop'] === $metaIntent['crop']) {
            $score += 2.5;
        }

        if ($metaIntent['category'] && $chunk['category'] === $metaIntent['category']) {
            $score += 1.5;
        }

        $norm = $queryInfo['normalized'];
        if (strlen($norm) > 5 && strpos($chunkTextLower, $norm) !== false) {
            $score += 3.0;
        }

        return round($score, 2);
    }

    /**
     * Call local ChromaDB Vector server HTTP API
     */
    private function retrieveFromVectorDB($query, $maxChunks = 3) {
        $url = 'http://127.0.0.1:8001/api/retrieve';
        $data = [
            'query' => $query,
            'top_k' => $maxChunks,
            'threshold' => 0.30
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => 3,
            CURLOPT_CONNECTTIMEOUT => 1,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200 && $response) {
            $json = json_decode($response, true);
            if (isset($json['retrieved_chunks']) && is_array($json['retrieved_chunks']) && count($json['retrieved_chunks']) > 0) {
                return $json['retrieved_chunks'];
            }
        }
        return null;
    }

    /**
     * Retrieve top matching chunks for query (Phase 2 Vector DB -> Fallback: Phase 1 Keyword)
     */
    public function retrieve($query, $maxChunks = null, $threshold = null) {
        $maxChunks = $maxChunks ?? (defined('RAG_MAX_CHUNKS') ? RAG_MAX_CHUNKS : 3);
        $threshold = $threshold ?? (defined('RAG_SCORE_THRESHOLD') ? RAG_SCORE_THRESHOLD : 1.2);

        if (empty(trim($query))) return [];

        // Priority 1: Vector DB Semantic Retrieval
        $vectorChunks = $this->retrieveFromVectorDB($query, $maxChunks);
        if (!empty($vectorChunks)) {
            return $vectorChunks;
        }

        // Priority 2: Fallback to Phase 1 Keyword Retrieval
        return $this->retrieveKeyword($query, $maxChunks, $threshold);
    }

    /**
     * Fallback Keyword Retrieval (Phase 1)
     */
    public function retrieveKeyword($query, $maxChunks = 3, $threshold = 1.2) {
        $queryInfo = $this->normalizeQuery($query);
        $metaIntent = [
            'crop' => (strpos($queryInfo['normalized'], 'rice') !== false || strpos($queryInfo['normalized'], 'paddy') !== false) ? 'rice' :
                      ((strpos($queryInfo['normalized'], 'tomato') !== false) ? 'tomato' : null),
            'category' => (strpos($queryInfo['normalized'], 'disease') !== false || strpos($queryInfo['normalized'], 'yellow') !== false || strpos($queryInfo['normalized'], 'blight') !== false) ? 'diseases' :
                          ((strpos($queryInfo['normalized'], 'fertilizer') !== false || strpos($queryInfo['normalized'], 'nitrogen') !== false || strpos($queryInfo['normalized'], 'npk') !== false) ? 'fertilizers' :
                          ((strpos($queryInfo['normalized'], 'water') !== false || strpos($queryInfo['normalized'], 'irrigation') !== false) ? 'irrigation' :
                          ((strpos($queryInfo['normalized'], 'ph') !== false || strpos($queryInfo['normalized'], 'soil') !== false) ? 'soil' : null)))
        ];

        $scored = [];
        foreach ($this->chunks as $chunk) {
            $score = $this->scoreChunk($chunk, $queryInfo, $metaIntent);
            if ($score >= $threshold) {
                $c = $chunk;
                $c['score'] = $score;
                $scored[] = $c;
            }
        }

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
        return array_slice($scored, 0, $maxChunks);
    }

    /**
     * Build RAG system prompt with retrieved context
     */
    public function buildRAGPrompt($query, $retrievedChunks, $langName = 'English', $context = []) {
        $prompt = "You are Krishi Saarthi, an expert Indian agricultural AI assistant. ALWAYS respond directly in {$langName}.\n";
        $prompt .= "Be concise, practical, and helpful (under 150 words). Do not show internal thinking tags or reasoning processes.\n\n";

        if (!empty($retrievedChunks)) {
            $prompt .= "RETRIEVED AGRICULTURAL KNOWLEDGE CONTEXT:\n";
            foreach ($retrievedChunks as $idx => $c) {
                $num = $idx + 1;
                $prompt .= "[Context {$num} | Source: {$c['source']} | Category: {$c['category']} | Topic: {$c['topic']}]\n";
                $prompt .= "{$c['text']}\n\n";
            }
            $prompt .= "INSTRUCTIONS:\n";
            $prompt .= "- Use the RETRIEVED AGRICULTURAL KNOWLEDGE CONTEXT above as your primary source to answer the farmer's question.\n";
            $prompt .= "- Avoid inventing unsupported agricultural facts.\n";
            $prompt .= "- If the context does not contain sufficient details to answer fully, state clearly what is known from the context and acknowledge missing info.\n";
            $prompt .= "- Do not present uncertain information as certain.\n";
        } else {
            $prompt .= "NO DIRECT KNOWLEDGE BASE MATCH FOUND FOR THIS SPECIFIC QUERY.\n";
            $prompt .= "INSTRUCTIONS:\n";
            $prompt .= "- Clearly inform the farmer that specific local knowledge base records were not found for this query.\n";
            $prompt .= "- Provide general safe farming guidance if applicable, but advise consulting a local KVK agricultural officer.\n";
        }

        $prompt .= "\nFARMER QUESTION: {$query}\n";
        $prompt .= "ANSWER IN " . strtoupper($langName) . ":";

        return $prompt;
    }

    public function getChunks() {
        return $this->chunks;
    }
}
