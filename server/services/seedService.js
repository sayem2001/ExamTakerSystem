const User = require('../models/User');
const Topic = require('../models/Topic');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const SystemSetting = require('../models/SystemSetting');

const seedInitialData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already contains records. Skipping seed.');
      return;
    }

    console.log('Seeding initial mathematical topics, questions, and admin...');

    // 1. Create Default Admin & Sample Students
    const admin = await User.create({
      name: 'Md Sayem (Admin)',
      email: 'sayemmd035@gmail.com',
      password: 'SayemExam11011',
      role: 'admin',
      institution: 'Central Examination Board',
    });

    const student1 = await User.create({
      name: 'Student Candidate',
      email: 'student@examtaker.com',
      password: 'StudentPassword123!',
      role: 'student',
      institution: 'Institute of Science & Technology',
    });

    const student2 = await User.create({
      name: 'Alex Rivera',
      email: 'alex@examtaker.com',
      password: 'StudentPassword123!',
      role: 'student',
      institution: 'Department of Applied Mathematics',
    });

    const student3 = await User.create({
      name: 'Elena Rostova',
      email: 'elena@examtaker.com',
      password: 'StudentPassword123!',
      role: 'student',
      institution: 'Mathematical Olympiad Team',
    });

    // 2. Create Topics
    const calculusTopic = await Topic.create({
      name: 'Calculus',
      slug: 'calculus',
      description: 'Differential and Integral Calculus, limits, series, and optimization',
      icon: 'Sigma',
    });

    const linearAlgebraTopic = await Topic.create({
      name: 'Linear Algebra',
      slug: 'linear-algebra',
      description: 'Vector spaces, matrices, determinants, eigenvalues, and linear transformations',
      icon: 'Grid',
    });

    const probabilityTopic = await Topic.create({
      name: 'Probability & Statistics',
      slug: 'probability-statistics',
      description: 'Random variables, distributions, Bayesian inference, and hypothesis testing',
      icon: 'PieChart',
    });

    // 3. Create Questions for Calculus (Easy, Medium, Hard)
    const questionsData = [
      // CALCULUS - EASY
      {
        topic: 'Calculus',
        difficulty: 'easy',
        questionText: 'What is the derivative of $f(x) = 5x^3 - 4x^2 + 7x - 9$ with respect to $x$?',
        options: [
          { key: 'A', text: '$15x^2 - 8x + 7$' },
          { key: 'B', text: '$15x^3 - 8x^2 + 7$' },
          { key: 'C', text: '$5x^2 - 4x + 7$' },
          { key: 'D', text: '$15x^2 - 8x$' },
        ],
        correctOption: 'A',
        explanation: 'Applying the power rule $\\frac{d}{dx}[x^n] = n x^{n-1}$ term by term gives $15x^2 - 8x + 7$.',
        points: 1,
        negativePoints: 0.25,
      },
      {
        topic: 'Calculus',
        difficulty: 'easy',
        questionText: 'Evaluate the definite integral: $\\int_{0}^{3} (2x + 1) \\, dx$.',
        options: [
          { key: 'A', text: '$9$' },
          { key: 'B', text: '$12$' },
          { key: 'C', text: '$15$' },
          { key: 'D', text: '$6$' },
        ],
        correctOption: 'B',
        explanation: 'The antiderivative is $F(x) = x^2 + x$. Then $F(3) - F(0) = (9 + 3) - 0 = 12$.',
        points: 1,
        negativePoints: 0.25,
      },
      {
        topic: 'Calculus',
        difficulty: 'easy',
        questionText: 'What is $\\lim_{x \\to 0} \\frac{\\sin(5x)}{x}$?',
        options: [
          { key: 'A', text: '$0$' },
          { key: 'B', text: '$1$' },
          { key: 'C', text: '$5$' },
          { key: 'D', text: '$\\infty$' },
        ],
        correctOption: 'C',
        explanation: 'Using the standard trigonometric limit $\\lim_{u \\to 0} \\frac{\\sin u}{u} = 1$, we multiply and divide by $5$: $5 \\times 1 = 5$.',
        points: 1,
        negativePoints: 0.25,
      },
      {
        topic: 'Calculus',
        difficulty: 'easy',
        questionText: 'What is the second derivative $f\'\'(x)$ of $f(x) = \\cos(2x)$?',
        options: [
          { key: 'A', text: '$-4\\cos(2x)$' },
          { key: 'B', text: '$-2\\sin(2x)$' },
          { key: 'C', text: '$4\\cos(2x)$' },
          { key: 'D', text: '$2\\sin(2x)$' },
        ],
        correctOption: 'A',
        explanation: '$f\'(x) = -2\\sin(2x)$ and $f\'\'(x) = -2 \\cdot 2 \\cos(2x) = -4\\cos(2x)$.',
        points: 1,
        negativePoints: 0.25,
      },

      // CALCULUS - MEDIUM
      {
        topic: 'Calculus',
        difficulty: 'medium',
        questionText: 'Evaluate the indefinite integral $\\int x e^{2x} \\, dx$.',
        options: [
          { key: 'A', text: '$\\frac{1}{2}x e^{2x} - \\frac{1}{4}e^{2x} + C$' },
          { key: 'B', text: '$x e^{2x} - e^{2x} + C$' },
          { key: 'C', text: '$\\frac{1}{2}x^2 e^{2x} + C$' },
          { key: 'D', text: '$\\frac{1}{4}(2x + 1)e^{2x} + C$' },
        ],
        correctOption: 'A',
        explanation: 'Integration by parts with $u = x \\implies du = dx$ and $dv = e^{2x}dx \\implies v = \\frac{1}{2}e^{2x}$. Thus $\\int u\\,dv = uv - \\int v\\,du = \\frac{1}{2}x e^{2x} - \\frac{1}{4}e^{2x} + C$.',
        points: 1,
        negativePoints: 0.25,
      },
      {
        topic: 'Calculus',
        difficulty: 'medium',
        questionText: 'Find the maximum value of $f(x) = x^3 - 3x + 2$ on the closed interval $[0, 2]$.',
        options: [
          { key: 'A', text: '$2$' },
          { key: 'B', text: '$4$' },
          { key: 'C', text: '$0$' },
          { key: 'D', text: '$3$' },
        ],
        correctOption: 'B',
        explanation: 'Critical points: $f\'(x) = 3x^2 - 3 = 0 \\implies x = 1$ in $(0, 2)$. Testing boundary and critical points: $f(0) = 2$, $f(1) = 0$, $f(2) = 8 - 6 + 2 = 4$. The global maximum is $4$.',
        points: 1,
        negativePoints: 0.25,
      },

      // CALCULUS - HARD
      {
        topic: 'Calculus',
        difficulty: 'hard',
        questionText: 'Evaluate the improper integral $\\int_{0}^{\\infty} x^3 e^{-x^2} \\, dx$.',
        options: [
          { key: 'A', text: '$\\frac{1}{2}$' },
          { key: 'B', text: '$1$' },
          { key: 'C', text: '$\\frac{3}{4}$' },
          { key: 'D', text: '$\\frac{\\sqrt{\\pi}}{2}$' },
        ],
        correctOption: 'A',
        explanation: 'Let $u = x^2 \\implies du = 2x\\,dx$, so $x\\,dx = \\frac{1}{2}du$. The integral becomes $\\frac{1}{2} \\int_{0}^{\\infty} u e^{-u} \\, du$. By the Gamma function, $\\int_0^\\infty u^{2-1} e^{-u} du = \\Gamma(2) = 1! = 1$. Multiplying by $\\frac{1}{2}$ gives $\\frac{1}{2}$.',
        points: 2,
        negativePoints: 0.5,
      },
      {
        topic: 'Calculus',
        difficulty: 'hard',
        questionText: 'Determine the radius of convergence $R$ for the Taylor series $\\sum_{n=1}^{\\infty} \\frac{(2n)!}{(n!)^2} x^n$.',
        options: [
          { key: 'A', text: '$R = \\frac{1}{4}$' },
          { key: 'B', text: '$R = 4$' },
          { key: 'C', text: '$R = 1$' },
          { key: 'D', text: '$R = 0$' },
        ],
        correctOption: 'A',
        explanation: 'Using the Ratio Test: $\\lim_{n \\to \\infty} \\left| \\frac{a_{n+1}}{a_n} \\right| = \\lim_{n \\to \\infty} \\frac{(2n+2)(2n+1)}{(n+1)^2} = 4$. Thus convergence requires $4|x| < 1 \\implies |x| < \\frac{1}{4}$, so $R = \\frac{1}{4}$.',
        points: 2,
        negativePoints: 0.5,
      },

      // LINEAR ALGEBRA - EASY
      {
        topic: 'Linear Algebra',
        difficulty: 'easy',
        questionText: 'What is the determinant of the matrix $A = \\begin{pmatrix} 4 & 3 \\\\ 2 & 5 \\end{pmatrix}$?',
        options: [
          { key: 'A', text: '$14$' },
          { key: 'B', text: '$26$' },
          { key: 'C', text: '$20$' },
          { key: 'D', text: '$10$' },
        ],
        correctOption: 'A',
        explanation: '$\\det(A) = ad - bc = (4)(5) - (3)(2) = 20 - 6 = 14$.',
        points: 1,
        negativePoints: 0.25,
      },
      // LINEAR ALGEBRA - MEDIUM
      {
        topic: 'Linear Algebra',
        difficulty: 'medium',
        questionText: 'Find the eigenvalues of $B = \\begin{pmatrix} 3 & 1 \\\\ 0 & 2 \\end{pmatrix}$.',
        options: [
          { key: 'A', text: '$\\lambda = 3, 2$' },
          { key: 'B', text: '$\\lambda = 5, 0$' },
          { key: 'C', text: '$\\lambda = 1, 6$' },
          { key: 'D', text: '$\\lambda = 3, 3$' },
        ],
        correctOption: 'A',
        explanation: 'For any upper triangular matrix, the eigenvalues are simply the diagonal entries: $\\lambda_1 = 3, \\lambda_2 = 2$.',
        points: 1,
        negativePoints: 0.25,
      },
      // LINEAR ALGEBRA - HARD
      {
        topic: 'Linear Algebra',
        difficulty: 'hard',
        questionText: 'Let $T: \\mathbb{R}^3 \\to \\mathbb{R}^3$ be a symmetric matrix with eigenvalues $\\lambda = 1, 2, 3$. What is the trace of $T^3$?',
        options: [
          { key: 'A', text: '$36$' },
          { key: 'B', text: '$14$' },
          { key: 'C', text: '$216$' },
          { key: 'D', text: '$30$' },
        ],
        correctOption: 'A',
        explanation: 'The eigenvalues of $T^3$ are $\\lambda_i^3$: $1^3 = 1$, $2^3 = 8$, $3^3 = 27$. The trace is the sum of the eigenvalues: $1 + 8 + 27 = 36$.',
        points: 2,
        negativePoints: 0.5,
      },
    ];

    const insertedQuestions = await Question.insertMany(questionsData);
    console.log(`Seeded ${insertedQuestions.length} mathematical questions.`);

    // 4. Create 3 Difficulty Exams for Calculus
    const calcEasyQs = insertedQuestions.filter((q) => q.topic === 'Calculus' && q.difficulty === 'easy').map((q) => q._id);
    const calcMedQs = insertedQuestions.filter((q) => q.topic === 'Calculus' && q.difficulty === 'medium').map((q) => q._id);
    const calcHardQs = insertedQuestions.filter((q) => q.topic === 'Calculus' && q.difficulty === 'hard').map((q) => q._id);

    const examEasy = await Exam.create({
      title: 'Calculus Benchmark - Easy Level',
      topic: 'Calculus',
      difficulty: 'easy',
      description: 'Covers essential differentiation rules, power rules, basic definite integrals, and standard limits.',
      examCode: 'CALC-EASY-101',
      scheduledDate: new Date(),
      durationMinutes: 45,
      passPercentage: 50,
      negativeMarking: true,
      negativeMarkingRate: 0.25,
      questions: calcEasyQs,
      createdBy: admin._id,
      status: 'published',
    });

    const examMed = await Exam.create({
      title: 'Calculus Mastery - Medium Level',
      topic: 'Calculus',
      difficulty: 'medium',
      description: 'Intermediate calculus covering integration by parts, extreme value theorem, and multivariable optimization.',
      examCode: 'CALC-MED-202',
      scheduledDate: new Date(),
      durationMinutes: 60,
      passPercentage: 50,
      negativeMarking: true,
      negativeMarkingRate: 0.25,
      questions: calcMedQs,
      createdBy: admin._id,
      status: 'published',
    });

    const examHard = await Exam.create({
      title: 'Calculus Olympiad - Hard Level',
      topic: 'Calculus',
      difficulty: 'hard',
      description: 'Challenging mathematical competition problems: improper integrals, Gamma functions, Taylor series convergence.',
      examCode: 'CALC-HARD-303',
      scheduledDate: new Date(),
      durationMinutes: 90,
      passPercentage: 40,
      negativeMarking: true,
      negativeMarkingRate: 0.5,
      questions: calcHardQs,
      createdBy: admin._id,
      status: 'published',
    });

    // 5. Seed realistic sample student submissions for Leaderboard showcase
    await ExamAttempt.create([
      {
        user: student3._id,
        exam: examEasy._id,
        status: 'submitted',
        startedAt: new Date(Date.now() - 3600000),
        submittedAt: new Date(Date.now() - 2400000),
        durationSeconds: 1200,
        score: 4,
        maxScore: 4,
        percentage: 100,
        passed: true,
        attemptedCount: 4,
        correctCount: 4,
        wrongCount: 0,
        unansweredCount: 0,
        answers: calcEasyQs.map((qId) => ({
          questionId: qId,
          selectedOption: 'A',
          isCorrect: true,
          pointsEarned: 1,
        })),
      },
      {
        user: student2._id,
        exam: examEasy._id,
        status: 'submitted',
        startedAt: new Date(Date.now() - 7200000),
        submittedAt: new Date(Date.now() - 5400000),
        durationSeconds: 1800,
        score: 2.75,
        maxScore: 4,
        percentage: 68.8,
        passed: true,
        attemptedCount: 4,
        correctCount: 3,
        wrongCount: 1,
        unansweredCount: 0,
        answers: calcEasyQs.map((qId, i) => ({
          questionId: qId,
          selectedOption: i === 1 ? 'C' : 'A',
          isCorrect: i !== 1,
          pointsEarned: i === 1 ? -0.25 : 1,
        })),
      },
    ]);

    // 6. System settings
    await SystemSetting.create({
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      platformName: 'ApexExam - AI Powered Mathematical Examination Platform',
      defaultDurationMinutes: 60,
      allowPublicRegistration: true,
    });

    console.log('Database seeded successfully with default Admin, Exams, and Leaderboard records!');
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

module.exports = { seedInitialData };
