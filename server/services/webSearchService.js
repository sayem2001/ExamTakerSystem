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

// Curated English Verbal blueprints (GMAT, GRE, SAT, BCS, and competitive verbal testing)
const ENGLISH_VERBAL_BLUEPRINTS = [
  {
    archetype: 'GMAT Sentence Correction: Faulty Parallelism & Ellipsis',
    description: 'Sentences joined by coordinating conjunctions or correlative pairs (not only... but also, either... or, as well as) where elements must strictly match in grammatical form.',
    trap: 'Pairing an infinitive with a gerund (e.g., "to investigate and examining"), or omitting prepositions that break parallel structure.',
    format: 'GMAT Sentence Correction with underlined clause and 5 options (A-E or A-D).',
  },
  {
    archetype: 'GMAT Sentence Correction: Dangling & Misplaced Modifiers',
    description: 'An introductory participial phrase (-ing or -ed) immediately followed by the wrong subject noun instead of the logical actor performing the action.',
    trap: 'Conversational habit makes the sentence sound understandable, but grammatically the modifier attributes the action to the wrong subject.',
    format: 'Sentence Correction testing clear modifier placement.',
  },
  {
    archetype: 'GMAT Critical Reasoning: Weaken / Strengthen Argument',
    description: 'A concise stimulus argument with premises and a conclusion. The question asks which option most seriously weakens or strongly reinforces the author’s deduction.',
    trap: 'Selecting an option that is true in the real world but attacks a premise rather than the logical connection between premise and conclusion.',
    format: 'Critical Reasoning argument stimulus with 4-5 analytical options.',
  },
  {
    archetype: 'GMAT Critical Reasoning: Underlying Assumption Identification',
    description: 'Finding the unstated premise that is absolutely required for the argument’s conclusion to logically hold (tested via the Negation Technique).',
    trap: 'Confusing an assumption with an additional supporting evidence fact that is not strictly necessary.',
    format: 'Assumption question format.',
  },
  {
    archetype: 'Subject-Verb Agreement with Intervening Prepositional Phrases',
    description: 'A singular or plural subject separated from its verb by multiple intervening prepositional phrases, appositives, or parenthetical clauses.',
    trap: 'Making the verb agree with the nearest noun inside the prepositional phrase rather than the actual grammatical subject.',
    format: 'Sentence Correction or Error Identification.',
  },
  {
    archetype: 'Nuanced Idiomatic Usage & Word Choice in Context',
    description: 'Testing exact prepositional idioms (e.g., "regard as" vs "regard to be", "prohibit from" vs "forbid to", "indifferent to", "acquitted of").',
    trap: 'Direct literal translation from other languages or conversational slang that violates standard formal usage.',
    format: 'Contextual sentence completion with subtle distractor options.',
  },
];

// Curated Universal Subject blueprints (Bangla, Science, ICT, History, General Knowledge - NO GMAT)
const UNIVERSAL_SUBJECT_BLUEPRINTS = [
  {
    archetype: 'Multi-Statement Evaluation (বহুপদী সমাপ্তিসূচক প্রশ্ন)',
    description: 'A core concept or historical/scientific event presented with 3 Roman-numeral statements (i, ii, iii). The examinee must identify which combination of statements is completely accurate.',
    trap: 'Statement (ii) contains half-truth or subtle inversion of a date/term, trapping students who only verify statement (i).',
    format: 'Multi-statement format: A) i ও ii   B) ii ও iii   C) i ও iii   D) i, ii ও iii',
  },
  {
    archetype: 'Conceptual Discrimination & Common Misconceptions',
    description: 'Distinguishing between two closely related laws, literary movements, constitutional articles, or scientific phenomena that sound similar.',
    trap: 'Plausible distractors constructed around common misconceptions or popular false beliefs.',
    format: 'Conceptual Multiple Choice with in-depth distractor justification.',
  },
  {
    archetype: 'Cause, Mechanism & Practical Application (কার্যকারণ ও প্রয়োগ)',
    description: 'Testing the underlying "Why" or "How" rather than mere memorization (e.g. why a biological process occurs under specific conditions, or the socioeconomic impact of a historical reform).',
    trap: 'Options that state real facts about the topic but do not answer the causal mechanism asked in the question.',
    format: 'Application-based problem scenario.',
  },
  {
    archetype: 'Negative Constraint Formulation ("Which of the following is NOT correct?")',
    description: 'Testing exhaustive mastery by asking examinees to identify the one false or inaccurate statement among three true, authoritative facts.',
    trap: 'Students overlook the negative keyword ("নয়" / "NOT") and pick the first correct fact they recognize.',
    format: 'Analytical verification across 4 comprehensive options.',
  },
  {
    archetype: 'Assertion & Reason / Fact-Context Relationship',
    description: 'Testing whether a foundational fact or law and an accompanying explanatory statement are both true, and whether the second is the correct explanation.',
    trap: 'Both statements are independently true, but the second is not the causal reason for the first.',
    format: 'Logical verification format.',
  },
];

/**
 * Perform a resilient web search for competitive problem ideas and forum discussions
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
 * Fetch competitive modification ideas, forum archetypes, and real-world patterns
 * tailored specifically for Math, English, or Universal subjects
 */
async function fetchSubjectModificationIdeas(topic = 'General Mathematics', subjectType = 'math') {
  const normalizedTopic = (topic || '').toLowerCase().trim();
  const normalizedSubject = (subjectType || 'math').toLowerCase().trim();

  let searchQueries = [];
  let matchedBlueprints = [];

  if (normalizedSubject === 'english') {
    searchQueries = [
      `site:gmatclub.com "Sentence Correction" "${topic}" tricky rules`,
      `site:gmatclub.com "Critical Reasoning" "${topic}" assumptions weaken`,
      `"${topic}" English verbal questions competitive exam traps`,
    ];
    matchedBlueprints = ENGLISH_VERBAL_BLUEPRINTS;
  } else if (normalizedSubject === 'universal') {
    searchQueries = [
      `"${topic}" MCQ questions competitive exam BCS admission`,
      `"${topic}" গুরুত্বপূর্ণ বহুনির্বাচনি প্রশ্ন উত্তর`,
      `"${topic}" conceptual questions multiple choice`,
    ];
    matchedBlueprints = UNIVERSAL_SUBJECT_BLUEPRINTS;
  } else {
    // Default: Math (GMAT Quant)
    searchQueries = [
      `site:gmatclub.com "${topic}" "hard" OR "700" OR "Data Sufficiency"`,
      `site:beatthegmat.com "${topic}" hard tricky questions`,
      `"${topic}" GMAT quantitative word problems tricky traps`,
    ];

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
  }

  console.log(`[Subject Search Engine] Researching competitive patterns for [${normalizedSubject.toUpperCase()}] "${topic}"...`);

  const webResults = [];
  const successfulQueries = [];

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
    console.warn('[Subject Search Engine] Search aggregation warning:', err.message);
  }

  const uniqueSnippets = [...new Set(webResults)].slice(0, 6);

  return {
    topic,
    subjectType: normalizedSubject,
    searchPerformed: true,
    liveSnippetsFound: uniqueSnippets.length,
    queriesUsed: successfulQueries,
    liveSnippets: uniqueSnippets,
    curatedBlueprints: matchedBlueprints,
    formattedResearchNotes: formatSubjectResearchForPrompt(topic, normalizedSubject, uniqueSnippets, matchedBlueprints),
  };
}

/**
 * Format the gathered search snippets and archetypes into clean instructions for Gemini
 */
function formatSubjectResearchForPrompt(topic, subjectType, snippets, blueprints) {
  const isEnglish = subjectType === 'english';
  const isUniversal = subjectType === 'universal';

  let title = `RESEARCHED COMPETITIVE EXAM BLUEPRINTS FOR "${topic.toUpperCase()}" (${subjectType.toUpperCase()}):`;
  if (isUniversal) {
    title = `COMPETITIVE ACADEMIC & BCS BLUEPRINTS FOR "${topic.toUpperCase()}" (NO GMAT FORMAT):`;
  } else if (isEnglish) {
    title = `GMAT / GRE / COMPETITIVE VERBAL BLUEPRINTS FOR "${topic.toUpperCase()}":`;
  }

  let notes = `${title}\n`;

  if (blueprints && blueprints.length > 0) {
    notes += `\nAuthentic Archetypes & Trap Structures:\n`;
    blueprints.forEach((bp, idx) => {
      notes += `\n[Archetype ${idx + 1}] ${bp.archetype}:\n- Mechanism: ${bp.description}\n- Trap to Include: ${bp.trap}\n- Target Format: ${bp.format}\n`;
    });
  }

  if (snippets && snippets.length > 0) {
    notes += `\nReal Forum Discussions & Resource Snippets:\n`;
    snippets.forEach((s, idx) => {
      notes += `- Insight ${idx + 1}: "${s}"\n`;
    });
  }

  if (isUniversal) {
    notes += `\nINSTRUCTION: Utilize the academic competitive blueprints above. Do NOT use GMAT type or Data Sufficiency. Formulate rigorous multi-statement (i, ii, iii), conceptual distinction, and cause-effect problems in the same language as the topic (Bangla or English).`;
  } else if (isEnglish) {
    notes += `\nINSTRUCTION: Utilize the verbal blueprints above to formulate authentic GMAT/GRE Sentence Correction, Critical Reasoning, and nuanced grammar/vocabulary questions with plausible distractor options.`;
  } else {
    notes += `\nINSTRUCTION: Utilize the ideas, trap formulations, and question structures above to elevate each original question into an authentic GMAT-level quantitative question within "${topic}". Include both GMAT Problem Solving and GMAT Data Sufficiency format.`;
  }

  return notes;
}

// Backwards-compatible alias for Math GMAT
const fetchGmatModificationIdeas = (topic) => fetchSubjectModificationIdeas(topic, 'math');

module.exports = {
  fetchSubjectModificationIdeas,
  fetchGmatModificationIdeas,
  searchCompetitiveWeb,
  ENGLISH_VERBAL_BLUEPRINTS,
  UNIVERSAL_SUBJECT_BLUEPRINTS,
};
