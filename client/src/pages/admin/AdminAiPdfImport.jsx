import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import MathRenderer from '../../components/MathRenderer';
import ExplanationRenderer from '../../components/ExplanationRenderer';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Calendar,
  Clock,
  Shield,
  Zap,
  Sliders,
  RefreshCw,
  Eye,
  Trash2,
  Search,
  Globe,
  Layers,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckSquare,
} from 'lucide-react';

export const SUBJECT_CONFIGS = {
  math: {
    id: 'math',
    name: 'Mathematics',
    tagline: 'Quantitative Problem Solving, Formulas & Equations',
    badgeText: 'GMAT Quant & LaTeX',
    accentColor: '#6366f1',
    defaultTopic: 'Profit and Loss',
    quickTopics: [
      'Profit and Loss',
      'Simple & Compound Interest',
      'Time, Speed & Distance',
      'Geometry & Mensuration',
      'Algebra & Equations',
      'Permutation & Probability',
    ],
    placeholder:
      'Paste math problems or exercises here...\n\nExample:\n1. A merchant marks his goods up by 25% above cost price and allows a discount of 10%. Find his profit percentage.\n2. A train traveling at 72 km/h crosses a 180m platform in 15 seconds. What is the length of the train?',
    difficulties: {
      easy: {
        title: 'Easy: Value Modification Only',
        subtitle: 'Preserves exact question concept, scenario, & relationships from source',
        color: '#34d399',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
        desc: 'Reads questions directly from the document and simply modifies numerical values, prices, percentages, or rates. Keeps the exact scenario, entities, and relationships 100% intact while recalculating all options and KaTeX solutions.',
      },
      medium: {
        title: 'Medium: Concept-Preserving Slight Modification',
        subtitle: 'Rephrased context, inverted unknown variables, or added intermediate steps',
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
        desc: 'The entire question and topic remain intact, but slight modifications are applied: rephrased wording, inverting variables to solve for different unknowns (e.g. solve for Cost Price instead of Selling Price), or adding extra contextual info while hiding intermediate details.',
      },
      hard: {
        title: 'Hard: GMAT-Level Difficulty & Live Web Search Grounding',
        subtitle: 'GMAT Problem Solving & Data Sufficiency with forum-researched trap patterns',
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.1)',
        border: 'rgba(244, 63, 94, 0.3)',
        desc: 'Reads original questions and significantly transforms them into GMAT-caliber quantitative reasoning problems within topic scope. Conducts live web research across GMAT Club, Beat The GMAT, and exam forums for tricky modification archetypes and subtle distractor traps.',
      },
    },
  },
  english: {
    id: 'english',
    name: 'English Verbal',
    tagline: 'Sentence Correction, Critical Reasoning & Verbal Aptitude',
    badgeText: 'GMAT / GRE Verbal Standard',
    accentColor: '#38bdf8',
    defaultTopic: 'Sentence Correction & Grammar',
    quickTopics: [
      'Sentence Correction',
      'Subject-Verb Agreement',
      'Critical Reasoning',
      'Parallelism & Modifiers',
      'Idiomatic Prepositions',
      'Vocabulary & Analogy',
    ],
    placeholder:
      'Paste English grammar exercises, sentence correction questions, or critical reasoning arguments here...\n\nExample:\n1. Neither the teacher nor the students (was/were) present at the symposium.\n2. Although the corporation reported record profits, its stock price plummeted because analysts expected even higher returns. Which option corrects the underlined error?',
    difficulties: {
      easy: {
        title: 'Easy: Direct Vocabulary & Subject Variation',
        subtitle: 'Substitutes vocabulary / context while preserving the exact grammatical rule',
        color: '#34d399',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
        desc: 'Takes the given questions and verbal archetypes as blueprints. Simply modifies vocabulary, subject-nouns, or direct context while keeping the grammatical structure, rule, and relationships 100% intact.',
      },
      medium: {
        title: 'Medium: Clause Inversion & Nuanced Phrasing',
        subtitle: 'Compound/complex structures, prepositional nuances & colloquial traps',
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
        desc: 'Inverts clauses, inserts modifying phrases between subject and verb, or tests subtle idiomatic prepositions and pronoun antecedent clarity with plausible distractors.',
      },
      hard: {
        title: 'Hard: GMAT/GRE Verbal Standard & Traps',
        subtitle: 'Elite Sentence Correction (parallelism/modifiers) & Critical Reasoning',
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.1)',
        border: 'rgba(244, 63, 94, 0.3)',
        desc: 'Elevates questions to GMAT/GRE 700+ verbal standards: strict correlative parallelism, subtle misplaced modifiers, subjunctive mood, comparison logic (like vs. as), and critical reasoning assumption/weaken structures.',
      },
    },
  },
  universal: {
    id: 'universal',
    name: 'Universal Subject',
    tagline: 'Bangla, Science, ICT, History & General Studies (Academic & BCS Standard)',
    badgeText: 'BCS & Admission (Non-GMAT)',
    accentColor: '#10b981',
    defaultTopic: 'বাংলা ব্যাকরণ ও সাহিত্য',
    quickTopics: [
      'বাংলা ব্যাকরণ ও সাহিত্য',
      'General Science & Environment',
      'Bangladesh & International Affairs',
      'ICT & Computer Science',
      'ইতিহাস ও মুক্তিযুদ্ধ',
      'সাধারণ বিজ্ঞান',
    ],
    placeholder:
      'যেকোনো বিষয়ের প্রশ্ন বা অনুশীলনী এখানে পেস্ট করুন (বাংলা বা ইংরেজি)...\n\nউদাহরণ:\n১. "আমার ভাইয়ের রক্তে রাঙানো একুশে ফেব্রুয়ারি" গানটির প্রথম সুরকার কে?\nক) আলতাফ মাহমুদ  খ) আব্দুল লতিফ  গ) সমর দাস  ঘ) শেখ লুৎফর রহমান\n২. আলোর প্রতিসরণের দ্বিতীয় সূত্রটি কে আবিষ্কার করেন?',
    difficulties: {
      easy: {
        title: 'Easy: Direct Conceptual & Factual Substitution',
        subtitle: 'Substitutes entity or event while preserving core law/definition (Non-GMAT)',
        color: '#34d399',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
        desc: 'Preserves the exact native language (Bangla or English) and core definition, substituting specific poets, historical years, terms, or species with accurate explanations.',
      },
      medium: {
        title: 'Medium: Application & Multi-Statement Evaluation',
        subtitle: 'Cause-effect, relationships, and i, ii, iii multi-statement options',
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
        desc: 'Standard BCS & University Admission level: multi-statement evaluation (i, ii, iii নিচের কোনটি সঠিক?), conceptual cause-effect, and grammatical rule discrimination. No GMAT format.',
      },
      hard: {
        title: 'Hard: High-Discrimination Competitive Mastery',
        subtitle: 'BCS Cadre & Premier University Admission A/B/C/D unit standards',
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.1)',
        border: 'rgba(244, 63, 94, 0.3)',
        desc: 'Highest-tier national competitive standard: tests rule exceptions, subtle misconceptions, multi-tier assertions, and highly deceptive distractors without GMAT jargon.',
      },
    },
  },
};

export const AdminAiPdfImport = () => {
  const navigate = useNavigate();

  // Wizard Steps: 1 = Upload & Generate, 2 = Review Questions, 3 = Schedule Exam, 4 = Published & Active
  const [step, setStep] = useState(1);

  // Subject Generator Engine: 'math' | 'english' | 'universal'
  const [subjectType, setSubjectType] = useState('math');

  // Input source mode: 'pdf' | 'paste'
  const [inputMode, setInputMode] = useState('pdf');

  // Configuration state
  const [pdfFile, setPdfFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [topic, setTopic] = useState('Profit and Loss');
  const [questionCount, setQuestionCount] = useState(15);
  const [customCountInput, setCustomCountInput] = useState('');
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [generationMode, setGenerationMode] = useState('single-scheduled'); // 'single-scheduled' | 'auto-3-exams'

  // Phase 1: Source Document Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [sourceQuestions, setSourceQuestions] = useState([]);
  const [distinctCases, setDistinctCases] = useState([]);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState('all');
  const [showSourceDrawer, setShowSourceDrawer] = useState(true);
  const [extractionMeta, setExtractionMeta] = useState(null);

  // Phase 2: Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [webSearchInsights, setWebSearchInsights] = useState(null);
  const [showSearchInsights, setShowSearchInsights] = useState(true);
  const [isLoadingVerified, setIsLoadingVerified] = useState(false);

  // General Processing & Output State
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [pdfMeta, setPdfMeta] = useState(null);
  const [createdExams, setCreatedExams] = useState([]);
  const [singleScheduledExam, setSingleScheduledExam] = useState(null);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Scheduling Form state
  const nowStr = new Date().toISOString().slice(0, 16);
  const futureStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [scheduledStartDate, setScheduledStartDate] = useState(nowStr);
  const [scheduledEndDate, setScheduledEndDate] = useState(futureStr);
  const [passPercentage, setPassPercentage] = useState(50);
  const [negativeMarking, setNegativeMarking] = useState(true);
  const [negativeRate, setNegativeRate] = useState(0.25);
  const [antiCheatSettings, setAntiCheatSettings] = useState({
    fullScreenRequired: true,
    maxTabSwitches: 3,
    blockCopyPaste: true,
    disableRightClick: true,
  });

  const currentSubjectConfig = SUBJECT_CONFIGS[subjectType] || SUBJECT_CONFIGS.math;

  const handleSubjectChange = (newSubject) => {
    if (newSubject === subjectType) return;
    setSubjectType(newSubject);
    const cfg = SUBJECT_CONFIGS[newSubject];
    if (cfg) {
      setTopic(cfg.defaultTopic);
    }
    setError('');
  };

  // Handle PDF file selection and auto-detect topic from filename
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.toLowerCase();
      const isDocValid =
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword' ||
        ext.endsWith('.pdf') ||
        ext.endsWith('.docx') ||
        ext.endsWith('.doc');

      if (!isDocValid) {
        setError('Please select a valid PDF or Word (.docx) document.');
        return;
      }
      setPdfFile(file);
      setError('');
      setSourceQuestions([]);
      setDistinctCases([]);
      setExtractionMeta(null);

      // Auto-detect topic from filename
      const filename = file.name.replace(/\.(pdf|docx|doc)$/i, '').replace(/[-_]/g, ' ');

      if (subjectType === 'english') {
        if (/sentence\s*correction|parallel|modifier|grammar/i.test(filename)) {
          setTopic('Sentence Correction & Grammar');
        } else if (/critical\s*reasoning|argument|assumption|weaken|strengthen/i.test(filename)) {
          setTopic('Critical Reasoning');
        } else if (/vocab|synonym|antonym|analogy/i.test(filename)) {
          setTopic('Vocabulary & Analogy');
        } else if (/preposition|idiom/i.test(filename)) {
          setTopic('Idiomatic Prepositions');
        } else {
          setTopic('Sentence Correction & Grammar');
        }
      } else if (subjectType === 'universal') {
        if (/বাংলা|ব্যাকরণ|সাহিত্য|সমাস|সন্ধি|কারক/i.test(filename)) {
          setTopic('বাংলা ব্যাকরণ ও সাহিত্য');
        } else if (/science|বিজ্ঞান|physics|chemistry|biology/i.test(filename)) {
          setTopic('General Science & Environment');
        } else if (/ict|computer|তথ্য\s*প্রযুক্তি/i.test(filename)) {
          setTopic('ICT & Computer Science');
        } else if (/বাংলাদেশ|আন্তর্জাতিক|affairs|history|ইতিহাস/i.test(filename)) {
          setTopic('Bangladesh & International Affairs');
        } else {
          setTopic('বাংলা ব্যাকরণ ও সাহিত্য');
        }
      } else {
        if (/profit|loss/i.test(filename)) {
          setTopic('Profit and Loss');
        } else if (/calculus|integral|derivative/i.test(filename)) {
          setTopic('Calculus');
        } else if (/algebra|matrix|vector/i.test(filename)) {
          setTopic('Linear Algebra');
        } else if (/geometry/i.test(filename)) {
          setTopic('Geometry');
        } else if (/trigonometry/i.test(filename)) {
          setTopic('Trigonometry');
        } else if (/probability|statistics/i.test(filename)) {
          setTopic('Probability & Statistics');
        } else {
          const cleaned = filename
            .replace(/^ACS\s*IBA\s*Math\s*Quant\s*/i, '')
            .replace(/^Chapter\s*\d+\s*/i, '')
            .trim();
          if (cleaned.length > 2) {
            setTopic(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
          }
        }
      }
    }
  };

  // Auto-detect topic from direct pasted text if topic is empty or default
  const handlePastedTextChange = (text) => {
    setPastedText(text);
    setError('');
    setSourceQuestions([]);
    setDistinctCases([]);
    setExtractionMeta(null);

    if (text.length > 15) {
      if (subjectType === 'english') {
        if (/sentence\s*correction|underlined|grammatical|parallel/i.test(text)) {
          setTopic('Sentence Correction');
        } else if (/argument|conclusion|assumption|weaken|strengthen/i.test(text)) {
          setTopic('Critical Reasoning');
        } else if (/preposition|idiom|phrasal/i.test(text)) {
          setTopic('Idiomatic Prepositions');
        } else if (/synonym|antonym|analogy|vocabulary/i.test(text)) {
          setTopic('Vocabulary & Analogy');
        }
      } else if (subjectType === 'universal') {
        if (/বাংলা|ব্যাকরণ|সমাস|সন্ধি|কারক|রবীন্দ্রনাথ|নজরুল/i.test(text)) {
          setTopic('বাংলা ব্যাকরণ ও সাহিত্য');
        } else if (/বিজ্ঞান|আলো|গতি|পরমাণু|কোষ|অভিকর্ষ/i.test(text)) {
          setTopic('সাধারণ বিজ্ঞান');
        } else if (/কম্পিউটার|মেমোরি|প্রসেসর|নেটওয়ার্ক|ইন্টারনেট|বাইনারি|আইসিটি/i.test(text)) {
          setTopic('তথ্য ও যোগাযোগ প্রযুক্তি (ICT)');
        } else if (/সংবিধান|মুক্তিযুদ্ধ|বঙ্গবন্ধু|সংসদ|আন্তর্জাতিক/i.test(text)) {
          setTopic('বাংলাদেশ ও আন্তর্জাতিক বিষয়াবলী');
        }
      } else {
        if (/profit|loss|selling\s*price|cost\s*price|markup|discount/i.test(text)) {
          setTopic('Profit and Loss');
        } else if (/simple\s*interest|compound\s*interest|principal|per\s*annum/i.test(text)) {
          setTopic('Simple & Compound Interest');
        } else if (/speed|distance|train|stream|boat|km\/h/i.test(text)) {
          setTopic('Time, Speed & Distance');
        } else if (/ratio|proportion|mixture|alligation/i.test(text)) {
          setTopic('Ratio & Proportion');
        } else if (/work|pipe|cistern|men\s*and\s*women/i.test(text)) {
          setTopic('Time & Work');
        } else if (/derivative|integral|limit|calculus|tangent/i.test(text)) {
          setTopic('Calculus');
        } else if (/quadratic|equation|polynomial|matrix|algebra/i.test(text)) {
          setTopic('Algebra');
        } else if (/triangle|circle|polygon|perimeter|area|angle|geometry/i.test(text)) {
          setTopic('Geometry');
        } else if (/permutation|combination|probability|dice|card/i.test(text)) {
          setTopic('Probability & Permutation');
        }
      }
    }
  };

  // =========================================================================
  // PHASE 1: READ ENTIRE DOCUMENT & EXTRACT ALL QUESTIONS (FILTER THEORY)
  // =========================================================================
  const handleScanAndExtract = async () => {
    if (inputMode === 'pdf' && !pdfFile) {
      setError('Please select an examination PDF document first.');
      return;
    }
    if (inputMode === 'paste' && !pastedText.trim()) {
      setError('Please paste examination question text into the text area first.');
      return;
    }

    setIsExtracting(true);
    setProcessing(true);
    setError('');
    setProgressMsg(
      inputMode === 'pdf'
        ? `Reading entire PDF, filtering theoretical definitions & formula sheets, and extracting all questions...`
        : `Scanning pasted text, filtering introductory notes & formulas, and extracting all questions...`
    );

    try {
      const formData = new FormData();
      if (inputMode === 'pdf') {
        formData.append('pdf', pdfFile);
      } else {
        formData.append('pastedText', pastedText.trim());
      }
      formData.append('topic', topic.trim());
      formData.append('subjectType', subjectType);

      const res = await api.extractQuestionsFromDoc(formData);

      if (!res.success || !res.extractedQuestions || res.extractedQuestions.length === 0) {
        throw new Error(res.message || 'No questions could be extracted from the document.');
      }

      setSourceQuestions(res.extractedQuestions);
      setDistinctCases(res.meta?.distinctCases || []);
      setExtractionMeta(res.meta);
      if (res.meta?.detectedTopic) {
        setTopic(res.meta.detectedTopic);
      }
      if (res.meta?.filename) {
        setPdfMeta({
          filename: res.meta.filename,
          originalName: res.meta.originalName,
        });
      }
      setShowSourceDrawer(true);
      setSelectedCaseFilter('all');
    } catch (err) {
      console.error('Scan & extraction error:', err);
      setError(err.message || 'Failed to extract questions from document');
    } finally {
      setIsExtracting(false);
      setProcessing(false);
      setProgressMsg('');
    }
  };

  // =========================================================================
  // PHASE 2: GENERATE CONFIGURED NUMBER OF QUESTIONS WITH DIVERSITY & DIFFICULTY
  // =========================================================================
  const handleGenerateQuestions = async () => {
    // If questions have not been scanned yet, run 1-click end-to-end
    if (sourceQuestions.length === 0) {
      return handleDirectProcessQuestions();
    }

    const effectiveCount = customCountInput ? parseInt(customCountInput, 10) : questionCount;
    if (!effectiveCount || effectiveCount < 1) {
      setError('Please provide a valid question count.');
      return;
    }

    setIsGenerating(true);
    setProcessing(true);
    setError('');
    setProgressMsg(
      difficulty === 'hard'
        ? subjectType === 'english'
          ? `Researching GMAT/GRE Verbal standards & trap patterns, then synthesizing ${effectiveCount} Verbal questions...`
          : subjectType === 'universal'
          ? `Applying BCS & University Admission high-discrimination standards, then synthesizing ${effectiveCount} questions...`
          : `Researching GMAT Club & competitive exam archives for tricky modification patterns, then synthesizing ${effectiveCount} GMAT-level questions across diverse cases...`
        : `Synthesizing ${effectiveCount} ${difficulty.toUpperCase()} questions across diverse problem cases...`
    );

    try {
      const payload = {
        extractedQuestions: sourceQuestions,
        topic: topic.trim(),
        difficulty,
        subjectType,
        questionCount: effectiveCount,
        pdfDocument: pdfMeta,
      };

      const res = await api.generateFromExtractedQuestions(payload);

      if (!res.success || !res.questions || res.questions.length === 0) {
        throw new Error(res.message || 'No questions could be synthesized.');
      }

      const effectiveTopic = res.meta?.detectedTopic || topic.trim();
      setTopic(effectiveTopic);
      setExtractedQuestions(res.questions);
      setWebSearchInsights(res.meta?.webSearchInsights || null);

      if (generationMode === 'auto-3-exams') {
        setProgressMsg('Auto-creating 3 exams: Easy, Medium, and Hard...');
        const autoRes = await api.autoCreateThreeExams({
          topic: effectiveTopic,
          questions: res.questions,
          pdfDocument: pdfMeta,
        });

        if (autoRes.success) {
          setCreatedExams(autoRes.exams);
          setStep(4);
        }
      } else {
        setScheduleTitle(`${effectiveTopic} Assessment (${difficulty.toUpperCase()} Tier)`);
        setStep(2); // Proceed to Review Step
      }
    } catch (err) {
      console.error('Question generation error:', err);
      setError(err.message || 'Failed to generate questions');
    } finally {
      setIsGenerating(false);
      setProcessing(false);
      setProgressMsg('');
    }
  };

  // Load Verified 30 Hard Questions from disk (Instant Review)
  const handleLoadVerifiedQuestions = async () => {
    setIsLoadingVerified(true);
    setError('');
    setProgressMsg('Loading 30 verified GMAT-level Hard questions from disk...');
    try {
      const res = await api.getVerifiedQuestions();
      if (res.success && res.questions && res.questions.length > 0) {
        setExtractedQuestions(res.questions);
        setTopic(res.topic || 'Profit and Loss');
        setDifficulty('hard');
        setScheduleTitle(`Profit and Loss Mastery Exam (HARD Tier - 30 Questions)`);
        setStep(2); // Proceed straight to Review Step
      } else {
        throw new Error(res.message || 'No verified questions found.');
      }
    } catch (err) {
      console.error('Failed to load verified questions:', err);
      setError(err.message || 'Could not load verified questions.');
    } finally {
      setIsLoadingVerified(false);
      setProgressMsg('');
    }
  };

  // Direct 1-Click Deploy of Verified 30 Hard Questions to Live Exam
  const handle1ClickDeployVerified = async () => {
    setIsLoadingVerified(true);
    setError('');
    setProgressMsg('Deploying verified 30 Hard questions directly to active exams...');
    try {
      const res = await api.deployVerifiedExam({
        title: 'Profit and Loss Mastery Exam (HARD Tier - 30 Questions)',
        topic: 'Profit and Loss',
        difficulty: 'hard',
      });
      if (res.success && res.exam) {
        setSingleScheduledExam(res.exam);
        setStep(4); // Straight to Success Confirmation
      } else {
        throw new Error(res.message || 'Failed to deploy verified exam.');
      }
    } catch (err) {
      console.error('Failed to deploy verified exam:', err);
      setError(err.message || 'Could not deploy verified exam.');
    } finally {
      setIsLoadingVerified(false);
      setProgressMsg('');
    }
  };

  // Direct 1-Click Synthesis (Bypasses Phase 1 review if desired)
  const handleDirectProcessQuestions = async () => {
    if (inputMode === 'pdf' && !pdfFile) {
      setError('Please upload an examination PDF document first.');
      return;
    }
    if (inputMode === 'paste' && !pastedText.trim()) {
      setError('Please paste examination question text into the text area first.');
      return;
    }
    if (!topic.trim()) {
      setError('Please provide a subject topic.');
      return;
    }

    const effectiveCount = customCountInput ? parseInt(customCountInput, 10) : questionCount;

    setProcessing(true);
    setIsGenerating(true);
    setError('');
    setProgressMsg(
      difficulty === 'hard'
        ? subjectType === 'english'
          ? `Scanning entire document, researching GMAT/GRE verbal blueprints, and generating ${effectiveCount} Verbal questions...`
          : subjectType === 'universal'
          ? `Scanning entire document, applying BCS & Admission standards, and generating ${effectiveCount} questions...`
          : `Scanning entire document, researching GMAT Club archives for modification blueprints, and generating ${effectiveCount} GMAT-level questions...`
        : `Scanning entire document and synthesizing ${effectiveCount} diverse ${difficulty.toUpperCase()} questions...`
    );

    try {
      const formData = new FormData();
      if (inputMode === 'pdf') {
        formData.append('pdf', pdfFile);
      } else {
        formData.append('pastedText', pastedText.trim());
      }
      formData.append('topic', topic.trim());
      formData.append('subjectType', subjectType);
      formData.append('questionCount', effectiveCount);
      formData.append('difficulty', difficulty);

      const res = await api.uploadAndProcessPdf(formData);

      if (!res.success || !res.questions || res.questions.length === 0) {
        throw new Error(res.message || 'No questions could be synthesized.');
      }

      const effectiveTopic = res.meta?.detectedTopic || topic.trim();
      setTopic(effectiveTopic);
      setExtractedQuestions(res.questions);
      setPdfMeta(res.meta);
      setWebSearchInsights(res.meta?.webSearchInsights || null);

      if (res.extractedSourceQuestions && res.extractedSourceQuestions.length > 0) {
        setSourceQuestions(res.extractedSourceQuestions);
        setDistinctCases(res.meta?.distinctCases || []);
      }

      if (generationMode === 'auto-3-exams') {
        setProgressMsg('Auto-synthesizing 3 exams: Easy, Medium, and Hard...');
        const autoRes = await api.autoCreateThreeExams({
          topic: effectiveTopic,
          questions: res.questions,
          pdfDocument: res.meta?.filename
            ? {
                filename: res.meta.filename,
                originalName: res.meta.originalName,
              }
            : undefined,
        });

        if (autoRes.success) {
          setCreatedExams(autoRes.exams);
          setStep(4);
        }
      } else {
        setScheduleTitle(`${effectiveTopic} Assessment (${difficulty.toUpperCase()} Tier)`);
        setStep(2); // Proceed to Review Step
      }
    } catch (err) {
      console.error('AI Question synthesis error:', err);
      setError(err.message || 'Failed to synthesize questions with Gemini');
    } finally {
      setProcessing(false);
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  // Step 3 -> Schedule Exam
  const handleScheduleExam = async (e) => {
    e.preventDefault();
    if (!scheduleTitle.trim()) {
      setError('Please enter an exam title.');
      return;
    }

    setProcessing(true);
    setError('');
    setProgressMsg('Publishing and scheduling assessment...');

    try {
      const res = await api.scheduleGeneratedExam({
        title: scheduleTitle.trim(),
        topic: topic.trim(),
        difficulty,
        scheduledDate: scheduledStartDate,
        scheduledEndDate: scheduledEndDate,
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        passPercentage: parseInt(passPercentage, 10) || 50,
        negativeMarking,
        negativeMarkingRate: parseFloat(negativeRate) || 0.25,
        antiCheatSettings,
        questions: extractedQuestions,
        pdfDocument: pdfMeta
          ? {
              filename: pdfMeta.filename,
              originalName: pdfMeta.originalName,
            }
          : undefined,
      });

      if (res.success && res.exam) {
        setSingleScheduledExam(res.exam);
        setStep(4); // Success step
      }
    } catch (err) {
      console.error('Schedule error:', err);
      setError(err.message || 'Failed to schedule exam.');
    } finally {
      setProcessing(false);
      setProgressMsg('');
    }
  };

  const handleCopyExamLink = (code) => {
    const link = `${window.location.origin}/exam/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Remove a single question from review list
  const handleDeleteQuestion = (idxToDelete) => {
    setExtractedQuestions(extractedQuestions.filter((_, idx) => idx !== idxToDelete));
  };

  // Difficulty explanation helper
  const getDifficultyInfo = (diff) => {
    const activeSubj = SUBJECT_CONFIGS[subjectType] || SUBJECT_CONFIGS.math;
    return activeSubj.difficulties[diff] || activeSubj.difficulties.medium;
  };

  const currentDiffInfo = getDifficultyInfo(difficulty);

  const resetAll = () => {
    setPdfFile(null);
    setPastedText('');
    setSourceQuestions([]);
    setDistinctCases([]);
    setExtractionMeta(null);
    setExtractedQuestions([]);
    setSingleScheduledExam(null);
    setCreatedExams([]);
    setError('');
    setStep(1);
  };

  // Filtered source questions based on selected case badge
  const filteredSourceQuestions = selectedCaseFilter === 'all'
    ? sourceQuestions
    : sourceQuestions.filter((q) => q.caseType === selectedCaseFilter);

  return (
    <div style={{ maxWidth: '1140px', margin: '2.5rem auto 5rem', padding: '0 1.5rem' }}>
      
      {/* Header & Stepper */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
          <Sparkles size={18} />
          <span>Intelligent Exam Synthesis & Extraction System</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
          AI PDF Exam Generator & Question Studio
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '860px', lineHeight: 1.6 }}>
          Upload examination PDFs or paste question sets for Math, English, or Universal subjects (Bangla, Science, ICT & General Studies). The system reads the full document, filters out theoretical text and formula sheets, lists all source questions, and generates diverse modified questions calibrated to your exact difficulty specifications.
        </p>

        {/* Wizard Step Indicators */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { num: 1, label: 'Document & Difficulty' },
            { num: 2, label: `Review Questions (${extractedQuestions.length})` },
            { num: 3, label: 'Schedule & Proctoring' },
            { num: 4, label: 'Published & Active' },
          ].map((s) => {
            const isClickable =
              s.num === 1 ||
              (s.num <= 3 && extractedQuestions.length > 0) ||
              (s.num === 4 && (singleScheduledExam || createdExams.length > 0));
            const isActive = step === s.num;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (isClickable) {
                    setError('');
                    setStep(s.num);
                  }
                }}
                disabled={!isClickable}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: isActive
                    ? 'rgba(99, 102, 241, 0.25)'
                    : isClickable
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(255, 255, 255, 0.01)',
                  border: isActive
                    ? '1.5px solid #6366f1'
                    : isClickable
                    ? '1px solid rgba(99, 102, 241, 0.3)'
                    : '1px solid var(--border-subtle)',
                  color: isActive ? '#a5b4fc' : isClickable ? '#cbd5e1' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isClickable ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 0 16px rgba(99, 102, 241, 0.25)' : 'none',
                }}
              >
                {s.num < step && extractedQuestions.length > 0 ? (
                  <CheckCircle2 size={16} color="#34d399" />
                ) : (
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isActive ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      color: isActive ? '#fff' : '#94a3b8',
                    }}
                  >
                    {s.num}
                  </span>
                )}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#fda4af',
          marginBottom: '2rem',
        }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ================= STEP 1: UPLOAD, EXTRACT & CONFIGURE GENERATION ================= */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* 3-WAY SPECIALIZED QUESTION GENERATOR SELECTOR */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color={currentSubjectConfig.accentColor} />
                  <span>3 Specialized Question Generators</span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
                  Choose your dedicated engine: Math retains quantitative GMAT logic, English tests GMAT/GRE Verbal standards, and Universal powers Bangla, Science & ICT (Non-GMAT).
                </p>
              </div>

              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: currentSubjectConfig.accentColor,
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${currentSubjectConfig.accentColor}40`,
                padding: '4px 12px',
                borderRadius: '20px',
              }}>
                Active: {currentSubjectConfig.name} ({currentSubjectConfig.badgeText})
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {Object.values(SUBJECT_CONFIGS).map((subj) => {
                const isSelected = subjectType === subj.id;
                return (
                  <div
                    key={subj.id}
                    onClick={() => handleSubjectChange(subj.id)}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.015)',
                      border: isSelected ? `2px solid ${subj.accentColor}` : '1px solid var(--border-subtle)',
                      boxShadow: isSelected ? `0 0 20px ${subj.accentColor}30` : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: `${subj.accentColor}25`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: subj.accentColor,
                          fontWeight: 800,
                          fontSize: '1rem',
                        }}>
                          {subj.id === 'math' ? '∑' : subj.id === 'english' ? 'Aa' : 'ব'}
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: isSelected ? '#fff' : '#e2e8f0' }}>
                            {subj.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: subj.accentColor, fontWeight: 700 }}>
                            {subj.badgeText}
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: subj.accentColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Check size={13} color="#fff" />
                        </div>
                      ) : (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: '1.5px solid #475569',
                        }} />
                      )}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                      {subj.tagline}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Action: 1-Click Load & Deploy 30 Verified Hard Questions */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.12) 0%, rgba(124, 58, 237, 0.15) 100%)',
            border: '1.5px solid rgba(244, 63, 94, 0.4)',
            borderRadius: '14px',
            padding: '1.25rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(225, 29, 72, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Sparkles size={24} color="#fda4af" />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Verified 30 Hard Questions Ready</span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: '#e11d48',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}>
                    GMAT 700+ Caliber
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '3px' }}>
                  Complete 30-question GMAT assessment pre-synthesized from IBA Chapter 6 Profit & Loss with zero truncation.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleLoadVerifiedQuestions}
                disabled={isLoadingVerified || processing}
                className="btn-secondary"
                style={{
                  padding: '10px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  borderColor: 'rgba(244, 63, 94, 0.4)',
                  color: '#fda4af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Eye size={16} />
                <span>Review 30 Questions</span>
              </button>
              <button
                type="button"
                onClick={handle1ClickDeployVerified}
                disabled={isLoadingVerified || processing}
                className="btn-primary"
                style={{
                  padding: '10px 22px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #e11d48 0%, #7c3aed 100%)',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Zap size={16} />
                <span>1-Click Deploy Exam</span>
              </button>
            </div>
          </div>
          
          {/* SECTION A: SOURCE DOCUMENT INPUT */}
          <div className="glass-card" style={{ padding: '2rem 2.5rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={20} color="#818cf8" />
                  <span>Phase 1: Upload Document & Extract Source Questions</span>
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
                  The document will be read completely, theoretical text and formulas filtered, and all original questions cataloged.
                </p>
              </div>

              {/* Mode Switcher: PDF Upload vs Direct Text Paste */}
              <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '3px',
                gap: '4px',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('pdf');
                    setError('');
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '7px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: inputMode === 'pdf' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                    color: inputMode === 'pdf' ? '#fff' : '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                  }}
                >
                  <UploadCloud size={16} />
                  <span>Upload PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInputMode('paste');
                    setError('');
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '7px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: inputMode === 'paste' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                    color: inputMode === 'paste' ? '#fff' : '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                  }}
                >
                  <FileText size={16} />
                  <span>Direct Text Paste</span>
                </button>
              </div>
            </div>

            {/* TAB A: PDF DROPZONE */}
            {inputMode === 'pdf' && (
              <div style={{
                border: '2px dashed rgba(99, 102, 241, 0.4)',
                borderRadius: '14px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(99, 102, 241, 0.03)',
                marginBottom: '1.5rem',
                position: 'relative',
                cursor: 'pointer',
              }}>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}>
                  <UploadCloud size={26} color="#818cf8" />
                </div>

                {pdfFile ? (
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>
                      📄 {pdfFile.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                      {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Full Document Reading & Question Extraction
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                        setSourceQuestions([]);
                      }}
                      style={{
                        marginTop: '10px',
                        background: 'rgba(244, 63, 94, 0.15)',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        color: '#fda4af',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Change / Remove File
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                      Click to select or drag and drop your exam PDF or Word DOCX
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                      Reads full document from first to last page • Supports PDF and Word (.docx) • Ignores theory & formulas
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB B: DIRECT QUESTION TEXT PASTE */}
            {inputMode === 'paste' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1' }}>
                    Paste Examination Questions, Exercises, or Chapter Material:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {pastedText.trim().split(/\s+/).filter(Boolean).length} words • {pastedText.length} characters
                    </span>
                    {pastedText && (
                      <button
                        type="button"
                        onClick={() => {
                          setPastedText('');
                          setSourceQuestions([]);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f43f5e',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  className="form-input"
                  rows={8}
                  placeholder={currentSubjectConfig.placeholder}
                  value={pastedText}
                  onChange={(e) => handlePastedTextChange(e.target.value)}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    resize: 'vertical',
                  }}
                />
              </div>
            )}

            {/* Action Bar for Phase 1 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>
                    {currentSubjectConfig.name} Topic:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`e.g. ${currentSubjectConfig.defaultTopic}`}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={{ width: '260px', padding: '8px 12px' }}
                  />
                </div>
                {currentSubjectConfig.quickTopics && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Quick topics:</span>
                    {currentSubjectConfig.quickTopics.map((qt) => (
                      <button
                        key={qt}
                        type="button"
                        onClick={() => setTopic(qt)}
                        style={{
                          background: topic === qt ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          border: topic === qt ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: topic === qt ? '#a5b4fc' : '#cbd5e1',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                      >
                        {qt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleScanAndExtract}
                disabled={(inputMode === 'pdf' ? !pdfFile : !pastedText.trim()) || isExtracting || processing}
                className="btn-primary"
                style={{
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isExtracting ? (
                  <>
                    <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                    <span>Extracting All Questions...</span>
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    <span>{sourceQuestions.length > 0 ? 'Re-scan Document Questions' : 'Scan & Extract Document Questions'}</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* SECTION B: EXTRACTED SOURCE QUESTIONS DASHBOARD & PREVIEW */}
          {sourceQuestions.length > 0 && (
            <div className="glass-card" style={{ padding: '2rem 2.5rem', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
              
              {/* Header & Metrics */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    <CheckCircle2 size={16} />
                    <span>Document Analysis Complete</span>
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                    Extracted Source Questions ({sourceQuestions.length})
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    {extractionMeta?.theoryFiltered || 'Filtered out theoretical explanations, definitions, and formulas.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSourceDrawer(!showSourceDrawer)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 14px' }}
                >
                  <Eye size={16} />
                  <span>{showSourceDrawer ? 'Hide Source Questions' : `Preview Extracted Questions (${sourceQuestions.length})`}</span>
                  {showSourceDrawer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Distinct Case Types Filter Bar */}
              {distinctCases.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}>
                    <Layers size={14} color="#a78bfa" />
                    <span>Problem Cases & Archetypes Detected in Document ({distinctCases.length}):</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedCaseFilter('all')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: selectedCaseFilter === 'all' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                        border: selectedCaseFilter === 'all' ? '1.5px solid #818cf8' : '1px solid var(--border-subtle)',
                        color: selectedCaseFilter === 'all' ? '#a5b4fc' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      All Cases ({sourceQuestions.length})
                    </button>
                    {distinctCases.map((cName, cIdx) => {
                      const caseCount = sourceQuestions.filter((q) => q.caseType === cName).length;
                      const isSelected = selectedCaseFilter === cName;
                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => setSelectedCaseFilter(cName)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected ? '1.5px solid #34d399' : '1px solid var(--border-subtle)',
                            color: isSelected ? '#34d399' : '#cbd5e1',
                            cursor: 'pointer',
                          }}
                        >
                          {cName} ({caseCount})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Collapsible Extracted Questions Drawer */}
              {showSourceDrawer && (
                <div style={{
                  maxHeight: '380px',
                  overflowY: 'auto',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  {filteredSourceQuestions.map((sq, sqIdx) => (
                    <div
                      key={sq.originalIndex || sqIdx}
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#818cf8' }}>
                          Source Question #{sq.originalIndex || sqIdx + 1}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#a5b4fc',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          }}>
                            {sq.caseType}
                          </span>
                          {sq.hasNumericalValues && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>
                              Values Ready
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                        <MathRenderer text={sq.questionText} />
                      </div>
                      {sq.coreConcept && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Principle: <em>{sq.coreConcept}</em>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* SECTION C: QUESTION GENERATION CONFIGURATION (PHASE 2) */}
          <div className="glass-card" style={{ padding: '2rem 2.5rem', border: '1px solid rgba(139, 92, 246, 0.35)' }}>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={20} color="#c084fc" />
                <span>Phase 2: Question Generation & Difficulty Settings</span>
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
                Specify how many questions to synthesize and select your desired difficulty calibration.
              </p>
            </div>

            {/* Target Question Count & Workflow Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
              
              {/* Question Count Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                  Target Question Count:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {[10, 20, 30, 40, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setQuestionCount(num);
                        setCustomCountInput('');
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: (!customCountInput && questionCount === num) ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(255, 255, 255, 0.03)',
                        color: (!customCountInput && questionCount === num) ? '#fff' : '#cbd5e1',
                        border: (!customCountInput && questionCount === num) ? '1px solid #818cf8' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Or custom count:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g. 35"
                    className="form-input"
                    style={{ width: '100px', padding: '5px 10px', fontSize: '0.85rem' }}
                    value={customCountInput}
                    onChange={(e) => setCustomCountInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Workflow Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                  Workflow Mode:
                </label>
                <select
                  className="form-select"
                  value={generationMode}
                  onChange={(e) => setGenerationMode(e.target.value)}
                >
                  <option value="single-scheduled">
                    📅 Synthesize & Review for Exam Scheduling
                  </option>
                  <option value="auto-3-exams">
                    ⚡ Auto-create 3 Exams (Easy, Medium, Hard Tiers)
                  </option>
                </select>
              </div>

            </div>

            {/* Difficulty Cards */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                Select Target Difficulty Level & Modification Strength:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                
                {/* EASY TIER */}
                <div
                  onClick={() => setDifficulty('easy')}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: difficulty === 'easy' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: difficulty === 'easy' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#34d399' }}>
                      🟢 {currentSubjectConfig.difficulties.easy.title}
                    </span>
                    {difficulty === 'easy' && <Check size={18} color="#34d399" />}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a7f3d0', marginBottom: '6px' }}>
                    {currentSubjectConfig.difficulties.easy.subtitle}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                    {currentSubjectConfig.difficulties.easy.desc}
                  </p>
                </div>

                {/* MEDIUM TIER */}
                <div
                  onClick={() => setDifficulty('medium')}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: difficulty === 'medium' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: difficulty === 'medium' ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fbbf24' }}>
                      🟡 {currentSubjectConfig.difficulties.medium.title}
                    </span>
                    {difficulty === 'medium' && <Check size={18} color="#fbbf24" />}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fde68a', marginBottom: '6px' }}>
                    {currentSubjectConfig.difficulties.medium.subtitle}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                    {currentSubjectConfig.difficulties.medium.desc}
                  </p>
                </div>

                {/* HARD TIER */}
                <div
                  onClick={() => setDifficulty('hard')}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: difficulty === 'hard' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: difficulty === 'hard' ? '2px solid #f43f5e' : '1px solid var(--border-subtle)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f43f5e' }}>
                      🔴 {currentSubjectConfig.difficulties.hard.title}
                    </span>
                    {difficulty === 'hard' && <Check size={18} color="#f43f5e" />}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fecdd3', marginBottom: '6px' }}>
                    {currentSubjectConfig.difficulties.hard.subtitle}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                    {currentSubjectConfig.difficulties.hard.desc}
                  </p>
                </div>

              </div>

              {/* Dynamic Difficulty Callout Box */}
              <div style={{
                background: currentDiffInfo.bg,
                border: `1px solid ${currentDiffInfo.border}`,
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                <Sliders size={20} color={currentDiffInfo.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: currentDiffInfo.color }}>
                    {currentDiffInfo.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '3px', lineHeight: 1.5 }}>
                    {currentDiffInfo.desc}
                  </div>

                  {difficulty === 'hard' && (
                    <div style={{
                      marginTop: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#f43f5e',
                      background: 'rgba(244, 63, 94, 0.15)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                    }}>
                      <Globe size={13} />
                      <span>
                        {subjectType === 'math'
                          ? 'Live Web Grounding Active: GMAT Club & Quantitative Exam Forum Blueprints Included'
                          : subjectType === 'english'
                          ? 'Live Web Grounding Active: GMAT/GRE Verbal & Sentence Correction Blueprints Included'
                          : 'Live Standard Grounding: BCS, Admission & Academic Exam Question Blueprints Included'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Diverse Coverage Guarantee Notice */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '10px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '1.75rem',
              color: '#c7d2fe',
              fontSize: '0.85rem',
            }}>
              <CheckSquare size={18} color="#818cf8" style={{ flexShrink: 0 }} />
              <span>
                <strong>Diversity Guarantee:</strong> Questions will be evenly distributed across all distinct problem archetypes and cases present in the document so no single case repeats excessively.
              </span>
            </div>

            {/* Progress Banner */}
            {processing && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '1.75rem',
              }}>
                <div className="animate-spin" style={{
                  width: '24px',
                  height: '24px',
                  border: '3px solid rgba(99, 102, 241, 0.3)',
                  borderTopColor: '#6366f1',
                  borderRadius: '50%',
                }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                    Gemini AI Processing...
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#a5b4fc', marginTop: '2px' }}>
                    {progressMsg}
                  </div>
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {extractedQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Review Generated Questions ({extractedQuestions.length})</span>
                    <ArrowRight size={16} />
                  </button>
                )}

                {extractedQuestions.length > 0 && extractedQuestions.length < 30 && (
                  <button
                    type="button"
                    onClick={handleLoadVerifiedQuestions}
                    disabled={isLoadingVerified || processing}
                    className="btn-secondary"
                    style={{
                      borderColor: 'rgba(244, 63, 94, 0.4)',
                      color: '#fda4af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Upgrade to Full 30 Hard Questions</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handle1ClickDeployVerified}
                  disabled={isLoadingVerified || processing}
                  className="btn-secondary"
                  style={{
                    borderColor: 'rgba(225, 29, 72, 0.4)',
                    color: '#fda4af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '14px 20px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                  }}
                >
                  <Zap size={16} />
                  <span>1-Click Deploy 30 Hard Qs</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateQuestions}
                  disabled={(inputMode === 'pdf' ? !pdfFile : !pastedText.trim()) || processing}
                  className="btn-primary"
                  style={{
                    padding: '14px 32px',
                    fontSize: '1rem',
                    background: difficulty === 'hard'
                      ? 'linear-gradient(135deg, #e11d48 0%, #7c3aed 100%)'
                      : difficulty === 'easy'
                      ? 'linear-gradient(135deg, #059669 0%, #6366f1 100%)'
                      : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  {isGenerating ? (
                    <span>Synthesizing Diverse Questions...</span>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>
                        Generate {customCountInput ? customCountInput : questionCount} Diverse {difficulty.toUpperCase()} Questions
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= STEP 2: REVIEW QUESTIONS ================= */}
      {step === 2 && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className={`badge badge-${difficulty}`}>
                  {difficulty.toUpperCase()} LEVEL
                </span>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Topic: <strong>{topic}</strong>
                </span>
                {webSearchInsights && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#f43f5e',
                    background: 'rgba(244, 63, 94, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Globe size={12} />
                    <span>GMAT Web Grounded</span>
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                Synthesized Questions ({extractedQuestions.length})
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                All questions have been uniquely transformed according to {difficulty.toUpperCase()} rules with full solutions. Review before proceeding to schedule.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => setStep(1)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back to Document & Settings</span>
              </button>

              <button
                onClick={() => setStep(3)}
                className="btn-primary"
                style={{
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Proceed to Schedule Exam</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Web Search Insights Callout for Hard Difficulty */}
          {webSearchInsights && showSearchInsights && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.75rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fda4af', fontWeight: 700, fontSize: '0.9rem' }}>
                  <Globe size={16} color="#f43f5e" />
                  <span>Researched GMAT Club & Competitive Exam Modification Insights</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSearchInsights(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Dismiss
                </button>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '8px', lineHeight: 1.5 }}>
                Questions in this assessment incorporate authentic GMAT Data Sufficiency formats, deceptive trap distractors, and multi-tier algebraic constraint modeling researched from competitive exam archives.
              </p>
              {webSearchInsights.sampleSnippets && webSearchInsights.sampleSnippets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {webSearchInsights.sampleSnippets.map((snip, sIdx) => (
                    <div key={sIdx} style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      • "{snip}"
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Question Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {extractedQuestions.map((q, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.5rem', position: 'relative' }}>
                
                {/* Header row: Question index, Case Badge, Modification Tag, Correct Option */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: '#818cf8', fontSize: '1.05rem' }}>
                      Question {idx + 1} of {extractedQuestions.length}
                    </span>

                    {q.caseType && (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#a5b4fc',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      }}>
                        {q.caseType}
                      </span>
                    )}

                    {q.modificationApplied && (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: difficulty === 'hard'
                          ? 'rgba(244, 63, 94, 0.15)'
                          : difficulty === 'easy'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                        color: difficulty === 'hard'
                          ? '#fda4af'
                          : difficulty === 'easy'
                          ? '#34d399'
                          : '#fcd34d',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}>
                        {q.modificationApplied}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}>
                      Correct: Option {q.correctOption}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(idx)}
                      title="Remove question"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f43f5e',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <div style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  <MathRenderer text={q.questionText} />
                </div>

                {/* Options grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '1rem' }}>
                  {q.options?.map((opt) => {
                    const isCorrect = opt.key.toUpperCase() === (q.correctOption || '').toUpperCase();
                    return (
                      <div
                        key={opt.key}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: isCorrect ? '1.5px solid #10b981' : '1px solid var(--border-subtle)',
                          color: isCorrect ? '#34d399' : '#cbd5e1',
                          fontSize: '0.85rem',
                        }}
                      >
                        <strong>{opt.key})</strong> <MathRenderer text={opt.text} />
                      </div>
                    );
                  })}
                </div>

                {/* Step-by-Step Detailed Explanation */}
                {q.explanation && (
                  <ExplanationRenderer
                    explanation={q.explanation}
                    correctOption={q.correctOption}
                    defaultExpanded={true}
                  />
                )}

              </div>
            ))}
          </div>

          {/* Bottom Navigation Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
            <button
              onClick={() => setStep(1)}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} />
              <span>Back to Document & Settings</span>
            </button>

            <button
              onClick={() => setStep(3)}
              className="btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Proceed to Schedule Exam</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: SCHEDULE EXAM FORM ================= */}
      {step === 3 && (
        <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  <Calendar size={18} />
                  <span>Step 3: Assessment Scheduling</span>
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
                  Schedule & Publish Assessment
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  Set testing window, duration, passing criteria, and anti-cheat lockdown policies for your {extractedQuestions.length} synthesized questions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Questions</span>
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleScheduleExam}>
            {/* Title & Topic */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Exam Title
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Topic / Subject
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={topic}
                  disabled
                  style={{ opacity: 0.8 }}
                />
              </div>
            </div>

            {/* Timing & Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Scheduled Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={scheduledStartDate}
                  onChange={(e) => setScheduledStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Scheduled End Date (Expiry)
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={scheduledEndDate}
                  onChange={(e) => setScheduledEndDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Test Duration (Minutes)
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="5"
                  max="300"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="100"
                  value={passPercentage}
                  onChange={(e) => setPassPercentage(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Anti-cheat Policies */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#f8fafc', fontWeight: 700 }}>
                <Shield size={18} color="#6366f1" />
                <span>Anti-Cheat Proctoring Rules</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={antiCheatSettings.fullScreenRequired}
                    onChange={(e) => setAntiCheatSettings({ ...antiCheatSettings, fullScreenRequired: e.target.checked })}
                  />
                  <span>Enforce Fullscreen Mode</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={antiCheatSettings.blockCopyPaste}
                    onChange={(e) => setAntiCheatSettings({ ...antiCheatSettings, blockCopyPaste: e.target.checked })}
                  />
                  <span>Block Copy & Paste</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={antiCheatSettings.disableRightClick}
                    onChange={(e) => setAntiCheatSettings({ ...antiCheatSettings, disableRightClick: e.target.checked })}
                  />
                  <span>Disable Right Click & Inspect</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Max Allowed Tab Switches:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    style={{ width: '70px', padding: '4px 8px' }}
                    value={antiCheatSettings.maxTabSwitches}
                    onChange={(e) => setAntiCheatSettings({ ...antiCheatSettings, maxTabSwitches: parseInt(e.target.value, 10) || 3 })}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons with clear Back & Forward actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Questions</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary"
                  style={{ opacity: 0.8 }}
                >
                  <span>Back to Input</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="btn-primary"
                style={{
                  padding: '14px 32px',
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
              >
                {processing ? (
                  <span>Publishing Exam...</span>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>Publish & Schedule Exam</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= STEP 4: SUCCESS / CONFIRMATION ================= */}
      {step === 4 && (
        <div>
          {singleScheduledExam ? (
            <div className="glass-card" style={{ padding: '3rem', border: '1px solid rgba(16, 185, 129, 0.4)', textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}>
                <CheckCircle2 size={36} color="#10b981" />
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Exam Successfully Scheduled!
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem' }}>
                Your assessment has been generated and published. Students can now take the exam using the code below.
              </p>

              {/* Exam Info Card */}
              <div style={{
                maxWidth: '540px',
                margin: '0 auto 2.5rem',
                padding: '1.5rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className={`badge badge-${singleScheduledExam.difficulty}`}>
                    {singleScheduledExam.difficulty.toUpperCase()} TIER
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    Code: {singleScheduledExam.examCode}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                  {singleScheduledExam.title}
                </h3>

                <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>📚 <strong>Topic:</strong> {singleScheduledExam.topic}</div>
                  <div>⏱️ <strong>Duration:</strong> {singleScheduledExam.durationMinutes} Minutes</div>
                  <div>🎯 <strong>Questions:</strong> {singleScheduledExam.questions?.length || extractedQuestions.length} Questions</div>
                  <div>✅ <strong>Pass Mark:</strong> {singleScheduledExam.passPercentage}%</div>
                </div>

                {/* Exam Access URL & Copy Button */}
                <div style={{
                  marginTop: '1.25rem',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    value={`${window.location.origin}/exam/${singleScheduledExam.examCode}`}
                    style={{ fontSize: '0.85rem', color: '#38bdf8' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyExamLink(singleScheduledExam.examCode)}
                    className="btn-secondary"
                    style={{ padding: '8px 14px', flexShrink: 0 }}
                  >
                    {copiedCode === singleScheduledExam.examCode ? (
                      <>
                        <Check size={16} color="#34d399" />
                        <span style={{ color: '#34d399' }}>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Links */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link
                  to={`/exam/${singleScheduledExam.examCode}`}
                  className="btn-primary"
                  style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                >
                  <Eye size={18} />
                  <span>Take Exam as Student</span>
                </Link>

                <Link
                  to="/admin/exams"
                  className="btn-secondary"
                  style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                >
                  <span>View All Scheduled Exams</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary"
                  style={{ padding: '12px 20px', fontSize: '0.95rem' }}
                >
                  <ArrowLeft size={16} />
                  <span>Review Questions</span>
                </button>

                <button
                  type="button"
                  onClick={resetAll}
                  className="btn-secondary"
                  style={{ padding: '12px 20px', fontSize: '0.95rem', opacity: 0.85 }}
                >
                  <RefreshCw size={16} />
                  <span>Create Another Assessment</span>
                </button>
              </div>
            </div>
          ) : (
            /* Multi-exam generated fallback */
            <div className="glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(16, 185, 129, 0.4)', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Exams Successfully Created!
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                <Link to="/admin/exams" className="btn-primary">
                  View Scheduled Exams
                </Link>
                <button
                  type="button"
                  onClick={resetAll}
                  className="btn-secondary"
                >
                  Create Another Exam
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AdminAiPdfImport;
