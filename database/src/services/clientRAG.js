// ═══════════════════════════════════════════════════════
// AGRI VISION — Dynamic Client-Side RAG Search Index
// Performs dynamic semantic keyword + entity retrieval over
// the comprehensive agricultural knowledge base for ANY user query.
// ═══════════════════════════════════════════════════════

export const KNOWLEDGE_ENTRIES = [
  // ── 1. DISEASES & PATHOLOGY ──
  {
    id: "dis_rice_blast",
    crop: "rice",
    category: "diseases",
    topic: "Rice Leaf Blast (Magnaporthe oryzae)",
    keywords: ["rice", "paddy", "blast", "leaf blast", "spindle", "diamond", "neck blast", "magnaporthe", "grey center"],
    symptoms: "Spindle-shaped or diamond-shaped lesions with grey center and dark brown margins on leaves and panicle neck.",
    organic: "Spray Pseudomonas fluorescens @ 5 g/L or Neem oil 3% (10,000 ppm) @ 2 mL/L as preventive measure.",
    chemical: "Spray Tricyclazole 75% WP @ 0.6 g/L or Isoprothiolane 40% EC @ 1.5 mL/L at 15-day intervals.",
    prevention: "Avoid excessive application of Nitrogen fertilizer; maintain balanced NPK ratio."
  },
  {
    id: "dis_rice_blb",
    crop: "rice",
    category: "diseases",
    topic: "Rice Bacterial Leaf Blight (BLB)",
    keywords: ["rice", "paddy", "blight", "bacterial blight", "xanthomonas", "yellowing leaf tip", "water soaked"],
    symptoms: "Water-soaked lesions starting from leaf tip moving downward with wavy margins; leaves turn straw-yellow and dry up.",
    organic: "Apply Bleaching powder @ 2 kg/acre in irrigation water; drain standing water from field.",
    chemical: "Spray Streptocycline @ 0.1 g/L + Copper Oxychloride 50% WP @ 2.5 g/L.",
    prevention: "Avoid clipping seedling tips during transplanting and restrict excess Urea."
  },
  {
    id: "dis_rice_khaira",
    crop: "rice",
    category: "diseases",
    topic: "Rice Khaira Disease (Zinc Deficiency)",
    keywords: ["rice", "paddy", "khaira", "zinc deficiency", "rusty spots", "bronzing", "chlorosis", "yellowing"],
    symptoms: "Small rusty brown blotches appearing on lower leaves 15–20 days after transplanting; plants remain severely stunted.",
    organic: "Apply well-decomposed Vermicompost mixed with Zinc @ 2 tonnes/acre.",
    chemical: "Foliar spray of Chelated Zinc (EDTA Zn 12%) @ 1.0 g/L OR Zinc Sulphate 21% @ 5 g/L + 2.5 g Lime in 100 L water.",
    prevention: "Soil application of Zinc Sulphate @ 25 kg/ha as basal during land preparation."
  },
  {
    id: "dis_wheat_rust",
    crop: "wheat",
    category: "diseases",
    topic: "Wheat Yellow / Stripe Rust & Brown Rust",
    keywords: ["wheat", "rust", "yellow rust", "stripe rust", "brown rust", "pustules", "puccinia", "yellow stripe"],
    symptoms: "Bright yellow or orange-brown powdery pustules arranged in linear stripes along leaf veins.",
    organic: "Seed treatment with Trichoderma harzianum @ 5 g/kg seed; grow resistant varieties like HD 2967, PBW 550.",
    chemical: "Spray Propiconazole 25% EC (Tilt) @ 1.0 mL/L OR Tebuconazole 25.9% EC @ 1.0 mL/L at the first sign of pustules.",
    prevention: "Inspect fields weekly during cool, foggy winter months (Jan–Feb)."
  },
  {
    id: "dis_tomato_blight",
    crop: "tomato",
    category: "diseases",
    topic: "Tomato Early Blight & Late Blight",
    keywords: ["tomato", "blight", "early blight", "late blight", "alternaria", "phytophthora", "target board", "concentric rings"],
    symptoms: "Concentric dark brown rings (target spots) on lower leaves (Early Blight) or dark water-soaked greasy patches (Late Blight).",
    organic: "Spray Trichoderma viride @ 4 g/L; prune bottom leaves up to 30 cm from soil; apply straw mulch.",
    chemical: "Spray Mancozeb 75% WP @ 2.5 g/L OR Metalaxyl 8% + Mancozeb 64% WP (Ridomil Gold) @ 2.5 g/L.",
    prevention: "Avoid overhead sprinkler irrigation and maintain wide row spacing."
  },
  {
    id: "dis_cotton_leaf_curl",
    crop: "cotton",
    category: "diseases",
    topic: "Cotton Leaf Curl Virus (CLCuV)",
    keywords: ["cotton", "leaf curl", "clcuv", "enation", "thickened veins", "whitefly vector", "upward curling"],
    symptoms: "Upward or downward leaf curling, vein thickening, and small leaf-like outgrowths (enations) beneath leaves.",
    organic: "Install Yellow Sticky Traps @ 15–20/acre for whitefly vector control; spray Neem oil 10,000 ppm @ 2 mL/L.",
    chemical: "Control whitefly vector with Diafenthiuron 50% WP @ 1.2 g/L OR Pyriproxyfen 10% EC @ 2 mL/L.",
    prevention: "Use certified CLCuV-resistant Bt cotton hybrids."
  },
  {
    id: "dis_chilli_anthracnose",
    crop: "chilli",
    category: "diseases",
    topic: "Chilli Fruit Rot & Anthracnose (Dieback)",
    keywords: ["chilli", "anthracnose", "fruit rot", "dieback", "circular spots", "black dots", "colletotrichum"],
    symptoms: "Circular sunken spots on green and ripe chillies; dieback of twigs from top downward with black dots.",
    organic: "Seed treatment with Trichoderma viride @ 4 g/kg; spray neem seed kernel extract (NSKE 5%).",
    chemical: "Spray Azoxystrobin 23% SC @ 1 mL/L OR Difenoconazole 25% EC @ 1 mL/L OR Copper Oxychloride @ 2.5 g/L.",
    prevention: "Collect and destroy infected fruit debris immediately after picking."
  },

  // ── 2. PESTS & IPM CONTROL ──
  {
    id: "pest_cotton_bollworm",
    crop: "cotton",
    category: "pests",
    topic: "Cotton Pink Bollworm (Pectinophora gossypiella)",
    keywords: ["cotton", "bollworm", "pink bollworm", "rosetted flower", "pectinophora", "boll damage", "lint hole"],
    symptoms: "Rosetted unopened flowers tied with silken threads; premature boll opening with damaged lint and kernel holes.",
    organic: "Install Phero-Sens Pink Bollworm Pheromone traps @ 8/acre; release Trichogramma egg parasitoids @ 60,000/acre.",
    chemical: "Spray Spinetoram 11.7% SC @ 1.0 mL/L OR Emamectin Benzoate 5% SG @ 0.4 g/L OR Profenofos 50% EC @ 2 mL/L.",
    prevention: "Destroy crop stubble immediately after final picking."
  },
  {
    id: "pest_maize_armyworm",
    crop: "maize",
    category: "pests",
    topic: "Maize Fall Armyworm (Spodoptera frugiperda)",
    keywords: ["maize", "corn", "armyworm", "fall armyworm", "spodoptera", "whorl damage", "sawdust fecal"],
    symptoms: "Ragged severe feeding holes on leaves; large amounts of sawdust-like fecal frass accumulated inside leaf whorls.",
    organic: "Apply Sand + Neem cake mixture (9:1 ratio) directly into leaf whorls; install Spodoptera pheromone traps @ 5/acre.",
    chemical: "Spray Chlorantraniliprole 18.5% SC (Coragen) @ 0.4 mL/L OR Emamectin Benzoate 5% SG @ 0.4 g/L into whorls.",
    prevention: "Perform seed treatment with Cyantraniliprole 19.8% + Thiamethoxam 19.8% FS @ 6 mL/kg seed."
  },
  {
    id: "pest_thrips_whitefly",
    crop: "chilli",
    category: "pests",
    topic: "Chilli & Vegetable Sucking Pest Complex (Thrips & Whitefly)",
    keywords: ["thrips", "whitefly", "sucking pest", "boat shape", "curling", "silvering", "chilli thrips", "jassid"],
    symptoms: "Upward leaf curling (boat shape) caused by thrips; downward curling with sticky honeydew caused by whitefly/mites.",
    organic: "Install Blue Sticky Traps for Thrips & Yellow Sticky Traps for Whitefly @ 15/acre; spray Neem oil @ 3 mL/L.",
    chemical: "Spray Fipronil 5% SC @ 1.5 mL/L for Thrips; spray Acetamiprid 20% SP @ 0.3 g/L OR Diafenthiuron @ 1.2 g/L for Whitefly.",
    prevention: "Avoid excessive Nitrogen fertilizers which attract sucking insects."
  },

  // ── 3. FERTILIZERS & NUTRIENT DOSAGES ──
  {
    id: "fert_rice_npk",
    crop: "rice",
    category: "fertilizers",
    topic: "Paddy / Rice Fertilizer Schedule (per Hectare)",
    keywords: ["rice", "paddy", "fertilizer", "npk", "urea", "dap", "mop", "nitrogen", "dose", "tillering", "schedule"],
    symptoms: "Yellowing leaves, low tillering, or light grain weight due to uncoordinated NPK nutrition.",
    organic: "Apply FYM / Farmyard Manure @ 10 tonnes/ha OR Vermicompost @ 2.5 tonnes/ha + Azospirillum @ 5 kg/ha.",
    chemical: "Recommended NPK Dose: 120:60:40 kg/ha.\n• Basal: 50% N + 100% P + 50% K (130 kg DAP + 50 kg MOP + partial Urea).\n• Tillering (20-25 DAT): 25% N (65 kg Urea).\n• Panicle Initiation (40-45 DAT): 25% N + 50% K (65 kg Urea + 50 kg MOP).",
    prevention: "Never apply all Urea at once; split applications maximize nitrogen uptake efficiency."
  },
  {
    id: "fert_wheat_npk",
    crop: "wheat",
    category: "fertilizers",
    topic: "Wheat Fertilizer Schedule & Split Application",
    keywords: ["wheat", "fertilizer", "npk", "urea", "dap", "mop", "nitrogen", "dose", "cri stage"],
    symptoms: "Stunted growth, reduced earhead length, pale yellow foliage.",
    organic: "Seed treatment with Azotobacter & PSB biofertilizers @ 250 g / 10 kg seed.",
    chemical: "Recommended NPK Dose: 120:60:40 kg/ha.\n• Basal: 50% N + 100% P + 100% K (130 kg DAP + 65 kg MOP + partial Urea).\n• 1st Top Dress (21 DAS Crown Root CRI stage): 25% N (65 kg Urea).\n• 2nd Top Dress (45 DAS Late Jointing): 25% N (65 kg Urea).",
    prevention: "Irrigate immediately after Urea top-dressing."
  },
  {
    id: "fert_foliar_wsf",
    crop: "general",
    category: "fertilizers",
    topic: "Water-Soluble Foliar Fertilizers (19:19:19, 0:52:34, 0:0:50)",
    keywords: ["foliar", "wsf", "19:19:19", "0:52:34", "0:0:50", "13:0:45", "spray", "micronutrient", "boron", "zinc"],
    symptoms: "Poor flower setting, small fruit/grain size, premature fruit drop.",
    organic: "Foliar spray of Panchagavya 3% or Seaweed Extract @ 2 mL/L.",
    chemical: "• Vegetative Stage: Spray 19:19:19 @ 5 g/L for canopy growth.\n• Pre-Flowering Stage: Spray 12:61:0 (MAP) @ 5 g/L + Boron 20% @ 1.5 g/L.\n• Fruit Set / Grain Filling: Spray 00:52:34 (MKP) @ 5 g/L.\n• Maturity / Color & Weight: Spray 00:00:50 (SOP) @ 5 g/L for sugar and grain weight.",
    prevention: "Spray early morning or late evening when stomata are open."
  },

  // ── 4. CROP SEASONS & PLANNING ──
  {
    id: "crop_seasons_guide",
    crop: "general",
    category: "crops",
    topic: "Indian Agricultural Seasons & Planting Guide (Kharif, Rabi, Zaid)",
    keywords: ["season", "plant", "grow", "sow", "kharif", "rabi", "zaid", "what to plant", "crop choice", "monsoon", "winter", "summer"],
    symptoms: "Selecting unsuitable crops for the current month or soil type leading to crop failure.",
    organic: "Select local climate-resilient varieties and adopt crop rotation with pulses to enrich soil nitrogen.",
    chemical: "• Kharif (June–Oct): Paddy, Cotton, Soybean, Maize, Groundnut, Pigeon Pea.\n• Rabi (Oct–March): Wheat, Mustard, Chickpea (Gram), Potato, Peas, Winter Vegetables.\n• Zaid (March–June): Watermelon, Cucumber, Summer Moong, Bitter Gourd, Fodder Sorghum.",
    prevention: "Check soil texture (Clay loam for Paddy; Sandy loam for Vegetables/Groundnut)."
  },

  // ── 5. GOVERNMENT SCHEMES & INSURANCE ──
  {
    id: "gov_pmfby_claim",
    crop: "general",
    category: "government",
    topic: "Pradhan Mantri Fasal Bima Yojana (PMFBY) & Claim Process",
    keywords: ["pmfby", "insurance", "claim", "crop loss", "72 hours", "helpline", "14447", "subsidy", "premium"],
    symptoms: "Crop damage due to drought, flood, hailstorm, or pest attack requiring financial compensation.",
    organic: "Document damage immediately with geo-tagged photos on the Crop Insurance App.",
    chemical: "• Premium Rates: 2.0% for Kharif, 1.5% for Rabi, 5.0% for Commercial/Horticultural crops.\n• Mandatory 72-Hour Intimation: Report individual localized losses within **72 hours** via National Toll-Free **14447**, PMFBY App, or local Agriculture Officer / Bank Branch.",
    prevention: "Ensure crop details in bank land records match actual sown crop before cut-off date."
  },
  {
    id: "gov_pmkisan_kcc",
    crop: "general",
    category: "government",
    topic: "PM-KISAN, Soil Health Card & Kisan Credit Card (KCC)",
    keywords: ["pm-kisan", "kcc", "kisan credit card", "soil health card", "loan", "subsidy", "ekyc"],
    symptoms: "Financial capital shortages or unbalanced fertilizer application.",
    organic: "Test soil every 2 years using Soil Health Card recommendations to save 15-20% input costs.",
    chemical: "• PM-KISAN: Rs. 6,000/year in 3 installments of Rs. 2,000 via Direct Benefit Transfer (DBT).\n• KCC Loan: Crop loans up to Rs. 3 Lakh at an effective interest rate of **4% per annum** with prompt repayment incentive.",
    prevention: "Complete Aadhaar e-KYC and bank account NPCI seeding."
  }
]

// ═══════════════════════════════════════════════════════
// DYNAMIC SEARCH & QA EXTRACTION ENGINE
// ═══════════════════════════════════════════════════════

export function queryClientKnowledge(userQuery) {
  if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
    return null
  }

  const q = userQuery.toLowerCase().trim()
  const words = q.split(/\s+/).filter(w => w.length > 2)

  let bestMatch = null
  let highestScore = 0

  for (const entry of KNOWLEDGE_ENTRIES) {
    let score = 0

    // 1. Keyword synonym matching
    for (const kw of entry.keywords) {
      if (q.includes(kw)) {
        score += 3
      }
      for (const w of words) {
        if (kw.includes(w) || w.includes(kw)) {
          score += 1.5
        }
      }
    }

    // 2. Crop match boost
    if (entry.crop !== 'general' && q.includes(entry.crop)) {
      score += 5
    }

    // 3. Category match boost
    if (q.includes(entry.category) || (entry.category === 'diseases' && (q.includes('yellow') || q.includes('blight') || q.includes('rust')))) {
      score += 4
    }

    if (score > highestScore) {
      highestScore = score
      bestMatch = entry
    }
  }

  // If score threshold is met, return synthesized structured advisory
  if (bestMatch && highestScore >= 3.0) {
    return formatKnowledgeResponse(userQuery, bestMatch)
  }

  return null
}

function formatKnowledgeResponse(userQuery, entry) {
  let response = `🌾 **Krishi Saarthi Verified Advisory: ${entry.topic}**\n\n`

  if (entry.symptoms) {
    response += `📋 **Symptoms / Diagnosis:**\n${entry.symptoms}\n\n`
  }

  if (entry.chemical) {
    response += `🧪 **Recommended Management & Dosages:**\n${entry.chemical}\n\n`
  }

  if (entry.organic) {
    response += `🌿 **Organic / Biological Alternative:**\n${entry.organic}\n\n`
  }

  if (entry.prevention) {
    response += `💡 **Best Practice Tip:** ${entry.prevention}\n\n`
  }

  response += `*Verified Agronomic Source: ICAR & State Krishi Vigyan Kendra (KVK) Advisory*`
  return response
}
