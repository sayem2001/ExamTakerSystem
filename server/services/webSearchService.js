/**
 * Web Search Service: Searches GMAT forums, question banks, and competitive exam resources
 * for real-world question structures, tricky trap patterns, and modification blueprints.
 */

// Curated GMAT question modification blueprints across key quantitative topics
const GMAT_TOPIC_BLUEPRINTS = {
  'profit and loss': [
    {
      archetype: 'Data Sufficiency: Ambiguous Cost/Selling Base',
      description: 'Is the profit percentage greater than 20%? Statement (1) provides SP to MP ratio; Statement (2) provides discount % on MP.',
      trap: 'Test-takers assume marked price equals cost price or mix up percentage on cost vs percentage on selling price.',
      format: 'Data Sufficiency with statements (1) and (2).',
    },
    {
      archetype: 'Multi-Batch Mixed Margins with Defective Units',
      description: 'A merchant buys N items, finds 10% damaged, and sells remainder at marked price M to achieve overall target profit P.',
      trap: 'Students forget to account for lost investment in unsellable units.',
      format: 'Multi-step Problem Solving with algebraic variables.',
    },
    {
      archetype: 'Successive Price Variations with Quantity Shifts',
      description: 'If cost price drops by X% and selling price increases by $Y, profit margin doubles. Determine original cost price.',
      trap: 'Formulating equations with percentage shifts on the new cost base rather than initial base.',
      format: 'Constraint-based algebraic problem.',
    },
    {
      archetype: 'Faulty Weight / Dishonest Merchant with Variable Markup',
      description: 'Dealer advertises sale at cost price but uses weight (1000 - w) grams and also gives a disguised discount.',
      trap: 'True profit = [Faulty measure savings / Effective outlay] * 100.',
      format: 'GMAT 700-level Problem Solving with fraction conversions.',
    },
  ],
  'time, speed & distance': [
    {
      archetype: 'Data Sufficiency: Average Speed of Round Trip',
      description: 'Find average speed of trip. Statement (1) gives ratio of speeds; Statement (2) gives total time.',
      trap: 'Average speed is the harmonic mean 2xy/(x+y), independent of distance if distances are equal.',
      format: 'Data Sufficiency.',
    },
    {
      archetype: 'Delayed Departure & Catch-Up with Variable Speeds',
      description: 'Train A leaves at t1 at speed v1; Train B leaves at t2, accelerates or encounters a scheduled stop.',
      trap: 'Miscalculating relative distance gap at the instant Train B starts.',
      format: 'Multi-stage Problem Solving.',
    },
  ],
  'time & work': [
    {
      archetype: 'Alternating Days with Variable Efficiencies',
      description: 'Worker A and B work on alternate hours; Worker C leaves after 3 hours. How many hours to complete the project?',
      trap: 'Integer cycle division leaves fractional work requiring specific worker sequence.',
      format: 'GMAT Problem Solving with floor/ceiling cycle traps.',
    },
    {
      archetype: 'Data Sufficiency: Work Combined Rates',
      description: 'Can machine A and B finish in under 4 hours? Statement (1) gives A alone; Statement (2) gives ratio of A to B rate.',
      format: 'Data Sufficiency.',
    },
  ],
  'simple & compound interest': [
    {
      archetype: 'Compounding Frequency & Effective Annual Yield',
      description: 'Comparing semi-annual vs quarterly compounding over fractional periods with variable interest changes.',
      trap: 'Applying linear multiplication instead of geometric powers.',
      format: 'GMAT Problem Solving.',
    },
    {
      archetype: 'Data Sufficiency: Difference between CI and SI',
      description: 'Find the principal. Statement (1) provides difference between CI and SI over 2 years; Statement (2) gives the rate.',
      trap: 'Formula CI - SI for 2 years = P * (R/100)^2.',
      format: 'Data Sufficiency.',
    },
  ],
  'algebra': [
    {
      archetype: 'Hidden Quadratic / Zero Divisor & Sign Constraints',
      description: 'Equations involving absolute values, integer domain constraints, or inequalities where variables could be negative.',
      trap: 'Multiplying both sides of inequality by unknown variable without checking sign.',
      format: 'Data Sufficiency or Problem Solving.',
    },
  ],
  'number properties': [
    {
      archetype: 'Divisibility, Remainder Cycles, and Prime Factorization',
      description: 'Finding remainders of large powers or determining if N has an odd number of factors (perfect squares).',
      trap: 'Overlooking case of 0, negative integers, or non-prime factor combinations.',
      format: 'Data Sufficiency.',
    },
  ],
};

/**
 * Perform a resilient web search for GMAT problem ideas and forum discussions
 */
async function searchCompetitiveWeb(query, maxSnippets = 4) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timeoutId);
    if (!res.ok) return [];

    const html = await res.text();
    const snippets = [];
    const regex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = regex.exec(html)) !== null && snippets.length < maxSnippets) {
      const clean = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (clean && clean.length > 25) {
        snippets.push(clean);
      }
    }

    return snippets;
  } catch (err) {
    // Non-fatal, web search failover
    console.warn(`[Web Search] Query "${query}" skipped (${err.message})`);
    return [];
  }
}

/**
 * Fetch GMAT modification ideas, forum archetypes, and real-world competitive exam patterns
 * for a specific mathematical topic
 */
async function fetchGmatModificationIdeas(topic = 'General Mathematics') {
  const normalizedTopic = (topic || '').toLowerCase().trim();
  const searchQueries = [
    `site:gmatclub.com "${topic}" "hard" OR "700" OR "Data Sufficiency"`,
    `site:beatthegmat.com "${topic}" hard tricky questions`,
    `"${topic}" GMAT quantitative word problems tricky traps`,
  ];

  console.log(`[GMAT Search Engine] Researching competitive exam patterns for "${topic}" across forums & archives...`);

  const webResults = [];
  const successfulQueries = [];

  // Search in parallel with timeout safety
  try {
    const searchPromises = searchQueries.map(async (query) => {
      const snippets = await searchCompetitiveWeb(query, 3);
      if (snippets.length > 0) {
        successfulQueries.push(query);
        webResults.push(...snippets);
      }
    });

    await Promise.allSettled(searchPromises);
  } catch (err) {
    console.warn('[GMAT Search Engine] Search aggregation warning:', err.message);
  }

  // Deduplicate web snippets
  const uniqueSnippets = [...new Set(webResults)].slice(0, 6);

  // Match topic blueprints or fallback
  let matchedBlueprints = [];
  for (const [key, blueprints] of Object.entries(GMAT_TOPIC_BLUEPRINTS)) {
    if (normalizedTopic.includes(key) || key.includes(normalizedTopic)) {
      matchedBlueprints = blueprints;
      break;
    }
  }

  if (matchedBlueprints.length === 0) {
    matchedBlueprints = [
      {
        archetype: 'Data Sufficiency: Sufficiency of Relative vs Absolute Quantities',
        description: 'Does the statement provide enough independent equations to determine the requested variable uniquely?',
        trap: 'Assuming variables must be positive integers without explicit constraints.',
        format: 'GMAT Data Sufficiency format with statements (1) and (2).',
      },
      {
        archetype: 'Multi-Step Constraint Modeling with Trap Distractors',
        description: 'Transforming a standard numerical problem into a variable-bound scenario with 2-3 interacting constraints.',
        trap: 'Designing distractor options around intermediate steps and common partial miscalculations.',
        format: 'GMAT 700-level Problem Solving.',
      },
    ];
  }

  console.log(
    `[GMAT Search Engine] Gathered ${uniqueSnippets.length} live forum snippets and ${matchedBlueprints.length} competitive blueprints for "${topic}".`
  );

  return {
    topic,
    searchPerformed: true,
    liveSnippetsFound: uniqueSnippets.length,
    queriesUsed: successfulQueries,
    liveSnippets: uniqueSnippets,
    curatedBlueprints: matchedBlueprints,
    formattedResearchNotes: formatGmatResearchForPrompt(topic, uniqueSnippets, matchedBlueprints),
  };
}

/**
 * Format the gathered search snippets and archetypes into clean instructions for Gemini
 */
function formatGmatResearchForPrompt(topic, snippets, blueprints) {
  let notes = `RESEARCHED GMAT & COMPETITIVE EXAM MODIFICATION BLUEPRINTS FOR "${topic.toUpperCase()}":\n`;

  if (blueprints && blueprints.length > 0) {
    notes += `\nAuthentic GMAT Archetypes & Trap Structures:\n`;
    blueprints.forEach((bp, idx) => {
      notes += `\n[Archetype ${idx + 1}] ${bp.archetype}:\n- Mechanism: ${bp.description}\n- Trap to Include: ${bp.trap}\n- Target Format: ${bp.format}\n`;
    });
  }

  if (snippets && snippets.length > 0) {
    notes += `\nReal Forum Discussions & Problem Snippets (GMAT Club / Beat The GMAT):\n`;
    snippets.forEach((s, idx) => {
      notes += `- Insight ${idx + 1}: "${s}"\n`;
    });
  }

  notes += `\nINSTRUCTION: Utilize the ideas, trap formulations, and question structures above to elevate each original question into an authentic GMAT-level question within "${topic}". Include both GMAT Problem Solving (with subtle distractor options) and GMAT Data Sufficiency format.`;

  return notes;
}

module.exports = {
  fetchGmatModificationIdeas,
  searchCompetitiveWeb,
};
