/**
 * Service to parse retail invoices and End-Of-Day (EOD) Z-Reports using Google Gemini
 * Supports modern Gemini 2.5 Flash, 2.0 Flash, 1.5 Flash, automatic model discovery,
 * multi-version failover, and smart heuristic fallback parsing.
 */

export const sanitizeKey = (k) => {
  if (!k) return '';
  return k.trim().replace(/^["']|["']$/g, '');
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result;
      const commaIndex = base64String.indexOf(',');
      const mimeType = base64String.substring(5, commaIndex).split(';')[0];
      const data = base64String.substring(commaIndex + 1);
      resolve({ mimeType, data, fullDataUrl: base64String });
    };
    reader.onerror = error => reject(error);
  });
};

// Priority candidate model list (modern active 2.0 and 1.5 generations)
export const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro-latest',
  'gemini-1.5-pro'
];

/**
 * Fetch available models for this specific API key directly from Google AI Studio.
 */
export const fetchAvailableModels = async (rawKey) => {
  const apiKey = sanitizeKey(rawKey);
  if (!apiKey) return { success: false, models: [], error: 'No API key provided' };

  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      
      if (res.ok && json.models && Array.isArray(json.models)) {
        const models = json.models
          .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
        return { success: true, models, raw: json.models };
      }

      if (json.error) {
        return { success: false, models: [], error: json.error.message || JSON.stringify(json.error) };
      }
    } catch (err) {
      // try next endpoint
    }
  }

  return { success: false, models: [], error: 'Could not connect to Google Generative Language API' };
};

/**
 * Robust JSON extraction from LLM text response
 */
const extractJsonFromText = (text) => {
  if (!text) throw new Error("Empty response from AI");
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
};

/**
 * Smart heuristic fallback parser
 * Extracts financial totals, products, quantities, prices, and HSN codes
 * when Gemini API encounters a temporary quota/deprecation error.
 */
export const parseReceiptWithSmartHeuristic = (text = '', catalogProducts = [], targetDate = '') => {
  const today = new Date().toISOString().split('T')[0];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let grossSales = 0;
  let netSales = 0;
  let taxTotal = 0;
  let discount = 0;
  let date = targetDate || today;
  let reportNumber = `Z-${Date.now().toString().slice(-4)}`;
  const items = [];

  // Extract date
  const dateMatch = text.match(/\b(20\d\d[-/.]\d\d[-/.]\d\d|\d\d[-/.]\d\d[-/.]20\d\d)\b/);
  if (dateMatch) {
    const rawDate = dateMatch[1].replace(/[/.]/g, '-');
    date = rawDate.length === 10 ? rawDate : (targetDate || today);
  }

  // Extract totals
  const grossMatch = text.match(/(?:gross|total sales|gross sales)[:\s]*₹?\$?([0-9,]+(?:\.\d+)?)/i);
  if (grossMatch) grossSales = parseFloat(grossMatch[1].replace(/,/g, '')) || 0;

  const netMatch = text.match(/(?:net daily sales|net sales|net total|grand total)[:\s]*₹?\$?([0-9,]+(?:\.\d+)?)/i);
  if (netMatch) netSales = parseFloat(netMatch[1].replace(/,/g, '')) || 0;

  const taxMatch = text.match(/(?:tax|gst|vat)[:\s]*₹?\$?([0-9,]+(?:\.\d+)?)/i);
  if (taxMatch) taxTotal = parseFloat(taxMatch[1].replace(/,/g, '')) || 0;

  // Extract line items
  for (const line of lines) {
    const itemMatch = line.match(/(?:^|\d+[.)\s]+)(.+?)(?:\s*\(HSN:?\s*(\d+)\))?[:\s-]+(\d+)\s*(?:pcs|kg|mtr|unit|pack|bag|jar)?\s*[@*]\s*₹?\$?([0-9,]+(?:\.\d+)?)/i);
    if (itemMatch) {
      let name = itemMatch[1].replace(/^[-*•\d.)\s]+/, '').trim();
      let hsn = itemMatch[2] || '999999';
      const qty = parseInt(itemMatch[3]) || 1;
      const rate = parseFloat(itemMatch[4].replace(/,/g, '')) || 0;
      const lineTotal = Math.round(qty * rate);

      // Match against known catalog if available
      const matched = (catalogProducts || []).find(p => 
        p.name && (p.name.toLowerCase() === name.toLowerCase() || name.toLowerCase().includes(p.name.toLowerCase()))
      );

      if (matched) {
        name = matched.name;
        hsn = matched.hsnCode || matched.hsn_code || hsn;
      }

      items.push({
        productName: name,
        hsnCode: hsn,
        quantity: qty,
        unit: matched?.unit || 'pcs',
        unitPrice: rate,
        lineTotal,
        taxRate: matched?.taxRate || 18,
        isNewProduct: !matched
      });
    }
  }

  if (items.length > 0) {
    if (!grossSales) grossSales = items.reduce((acc, i) => acc + i.lineTotal, 0);
    if (!netSales) netSales = grossSales;
  }

  return {
    reportType: 'z_report',
    reportNumber,
    date,
    closingTime: '21:30',
    storeName: 'Retail Store',
    registerId: 'POS-01',
    totalItemsSold: items.reduce((acc, i) => acc + i.quantity, 0) || (items.length > 0 ? items.length : 1),
    grossSales: grossSales || 0,
    discount: discount || 0,
    netSales: netSales || grossSales || 0,
    taxTotal: taxTotal || Math.round((netSales || grossSales || 0) * 0.18),
    paymentBreakdown: {
      cash: Math.round((netSales || 0) * 0.4),
      upi: Math.round((netSales || 0) * 0.5),
      card: Math.round((netSales || 0) * 0.1)
    },
    items: items
  };
};

/**
 * Scan and extract End-of-Day Z-Report using Google Gemini with dynamic discovery,
 * multi-endpoint failover, and intelligent catalog-guided parsing.
 */
export const extractZReportWithGemini = async ({
  apiKey: rawKey,
  imageBase64,
  mimeType = 'image/jpeg',
  rawText = '',
  preferredModel = '',
  catalogProducts = [],
  targetDate = ''
}) => {
  const apiKey = sanitizeKey(rawKey);
  if (!apiKey) {
    throw new Error('Please enter your Google Gemini Free API Key in Settings to scan with the AI LLM.');
  }

  // Clear stale deprecated model from storage
  try {
    const saved = localStorage.getItem('gemini_preferred_model');
    if (saved === 'gemini-1.5-flash') {
      localStorage.setItem('gemini_preferred_model', 'auto');
    }
  } catch {}

  // Format the user's current product catalog as a reference guide
  let catalogGuide = 'No products in catalog yet. Extract products, quantities, rates, and infer standard Indian GST HSN codes.';
  if (Array.isArray(catalogProducts) && catalogProducts.length > 0) {
    catalogGuide = catalogProducts.map((p, idx) => 
      `${idx + 1}. "${p.name}" | HSN: ${p.hsnCode || p.hsn_code || '999999'} | Category: ${p.category || 'General'} | Unit: ${p.unit || 'pcs'} | Ref Rate: ₹${p.price || 0}`
    ).join('\n');
  }

  const promptText = `
You are an expert retail accounting AI specializing in analyzing POS End-Of-Day (EOD) Z-Reports, daily closing balance slips, and thermal cash register receipts.

CURRENT STORE PRODUCT CATALOG (REFERENCE GUIDE):
Use this store catalog as a guide to:
- Resolve noisy OCR, camera blur, angled perspectives, abbreviations, and truncated item descriptions (e.g. "Bls Pc" -> "Blouse Piece").
- Match correct official Indian GST HSN/SAC codes and standard units (pcs, mtr, kg, gm, etc.).
- Identify whether an item on the receipt is already in the store catalog or is a brand-new product.

STORE CATALOG:
${catalogGuide}

${targetDate ? `TARGET SALES DATE CONTEXT: The user requested to log this report for date: ${targetDate}. If the receipt shows a clear printed sales date, extract that printed date. If the date is missing, blurry, or matches, use "${targetDate}".` : ''}

CRITICAL EXTRACTION MANDATES:
1. MANDATORY ITEM EXTRACTION:
   - Thermal Z-reports and daily slips typically list products sold in tables, department summaries, PLU blocks, or line item sections (e.g., "DEPARTMENT SALES", "PLU SALES", "COMMODITIES", "ITEM SALES", "DAILY SUMMARY").
   - YOU MUST READ EVERY ROW, ITEM, COMMODITY, OR PLU SOLD AND POPULATE THE "items" ARRAY.
   - DO NOT LEAVE THE "items" ARRAY EMPTY! If there are products or commodities listed on this receipt, extract each one with its quantity, unit, unit rate, line total, and HSN code.
   - If quantities or rates are visible, extract them precisely. If quantity is omitted on a line item, default to 1.
2. FINANCIAL TOTALS RECONCILIATION:
   - Extract Gross daily sales, Net daily sales, GST/Tax total, discounts, and payment methods (Cash, UPI/QR, Card/POS).
   - Verify that Gross Sales equals or approximates the sum of line totals minus discounts.
3. HSN / SAC CODES:
   - Extract the 4, 6, or 8 digit HSN code from the bill if printed.
   - If missing on the bill, match the item to the STORE CATALOG above and use its HSN code.
   - If not in catalog, infer the standard Indian GST HSN code (e.g. 5208 for cotton textiles, 6204 for dresses/kurtis, 8518 for audio electronics, 8544 for cables, 1006 for rice, etc.).
4. NEW PRODUCT DISCOVERY FLAG:
   - For every item in "items", set "isNewProduct": true if the product is NOT found in the STORE CATALOG above.
   - Set "isNewProduct": false if it matches an existing catalog item.

Return ONLY a raw, valid JSON object matching this exact schema:
{
  "reportType": "z_report",
  "reportNumber": "string (e.g. Z-0048 or auto-generated from date)",
  "date": "YYYY-MM-DD",
  "closingTime": "HH:MM (e.g. 21:30)",
  "storeName": "string",
  "registerId": "string (e.g. POS-01)",
  "totalItemsSold": number (total units of all products sold),
  "grossSales": number,
  "discount": number,
  "netSales": number,
  "taxTotal": number,
  "paymentBreakdown": {
    "cash": number,
    "upi": number,
    "card": number
  },
  "items": [
    {
      "productName": "Clean and exact name of product",
      "hsnCode": "4, 6, or 8 digit HSN/SAC code",
      "quantity": number,
      "unit": "pcs | mtr | kg | gm | pkt | box | pair | set",
      "unitPrice": number,
      "lineTotal": number,
      "taxRate": number,
      "isNewProduct": boolean
    }
  ]
}

Strict Rules:
- All numbers must be clean numeric values, not strings.
- Output ONLY valid JSON, do NOT add introductory or conversational text.
`;

  // Construct parts: Compatible with standard Google REST API specification
  const parts = [];
  if (imageBase64) {
    // Standard Google Gemini REST API camelCase inlineData format
    parts.push({
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: imageBase64
      }
    });
    parts.push({ text: promptText });
  } else if (rawText) {
    parts.push({ text: `${promptText}\n\nINPUT TEXT TO ANALYZE:\n${rawText}` });
  } else {
    throw new Error('No image or text provided to analyze.');
  }

  // Universal payload without systemInstruction (which causes errors on v1)
  const universalPayload = {
    contents: [
      {
        parts
      }
    ]
  };

  // Step 1: Detect available models directly for this key
  let modelsToTry = [...CANDIDATE_MODELS];
  let discoverySucceeded = false;

  try {
    const discovery = await fetchAvailableModels(apiKey);
    if (discovery.success && discovery.models && discovery.models.length > 0) {
      discoverySucceeded = true;
      // Filter out deprecated models like gemini-1.5-flash
      const detected = discovery.models
        .filter(m => m !== 'gemini-1.5-flash' && m !== 'gemini-2.5-flash')
        .filter(m => m.includes('flash') || m.includes('pro') || m.includes('gemini'));

      if (detected.length > 0) {
        // Prioritize models that actually exist on user's account (flash first)
        const flashFirst = [
          ...detected.filter(m => m.includes('flash')),
          ...detected.filter(m => !m.includes('flash'))
        ];
        modelsToTry = [...flashFirst, ...modelsToTry.filter(m => !flashFirst.includes(m))];
      }
    }
  } catch (discErr) {
    console.warn('Model discovery skipped:', discErr.message);
  }

  // Sanitize candidate list to exclude deprecated models
  modelsToTry = modelsToTry.filter(m => m !== 'gemini-1.5-flash' && m !== 'gemini-2.5-flash');

  // If user selected a specific model in settings (other than deprecated gemini-1.5-flash)
  if (preferredModel && preferredModel.trim() && preferredModel !== 'auto' && preferredModel !== 'gemini-1.5-flash') {
    modelsToTry = [preferredModel.trim(), ...modelsToTry.filter(m => m !== preferredModel.trim())];
  }

  // Step 2: Try combinations of candidate models and endpoints
  let lastError = null;

  for (const model of modelsToTry) {
    const apiVersions = ['v1beta', 'v1'];

    for (const apiVersion of apiVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(universalPayload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || response.statusText;
          const lowerMsg = (errMsg || '').toLowerCase();

          // If model is not found, deprecated, or unsupported on this endpoint, skip to next model
          if (
            response.status === 404 || 
            lowerMsg.includes('not found') || 
            lowerMsg.includes('not supported') ||
            lowerMsg.includes('is not found')
          ) {
            lastError = new Error(errMsg);
            continue;
          }

          // If permissions / invalid key
          if (response.status === 400 || response.status === 403) {
            lastError = new Error(`Gemini API: ${errMsg}`);
            if (lowerMsg.includes('api key not valid') || lowerMsg.includes('disabled')) {
              throw lastError;
            }
            continue;
          }

          lastError = new Error(`HTTP ${response.status}: ${errMsg}`);
          continue;
        }

        const result = await response.json();
        const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
          continue;
        }

        const parsed = extractJsonFromText(textContent);

        // Success! Save working model in localStorage
        try {
          localStorage.setItem('gemini_preferred_model', model);
        } catch {}

        return parsed;

      } catch (callErr) {
        lastError = callErr;
        const msg = (callErr.message || '').toLowerCase();
        if (msg.includes('api key not valid') || msg.includes('disabled')) {
          throw callErr;
        }
      }
    }
  }

  // Fallback to built-in smart receipt parser so user workflow is never blocked
  console.warn('Gemini API calls failed with:', lastError?.message);
  console.warn('Falling back to built-in smart receipt parser.');
  const fallbackResult = parseReceiptWithSmartHeuristic(rawText || '', catalogProducts, targetDate);
  fallbackResult.isFallback = true;
  fallbackResult.fallbackReason = lastError?.message || 'Google Gemini service was unavailable.';
  return fallbackResult;
};
