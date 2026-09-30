"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Flame,
  Lightbulb,
  Mic2,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { ANSWERS } from "./data";

type QuizVariant = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

type Topic = {
  id: string;
  title: string;
  category: string;
  easy: string;
  interview: string;
  trick?: string;
  code?: string;
  followUp?: string;
  quiz: QuizVariant[];
};

const CORE_TOPICS: Topic[] = [
  {
    id: "parallel-testing",
    title: "What is parallel testing?",
    category: "Parallel Execution",
    easy:
      "Parallel testing means running more than one test at the same time. Instead of Test 1 finishing before Test 2 starts, both can run together.",
    interview:
      "Parallel testing is the execution of multiple test cases, classes, or test sets simultaneously using separate threads to reduce overall execution time.",
    trick: "Parallel = same time. Think: 4 checkout counters working together.",
    followUp: "Can parallel testing create flaky tests? Why?",
    quiz: [
      {
        question: "What does parallel testing mainly mean?",
        options: [
          "Running multiple tests at the same time",
          "Running only failed tests",
          "Running one test many times",
          "Running tests without Selenium",
        ],
        answer: 0,
        explanation: "Parallel testing means multiple tests execute simultaneously, usually on different threads.",
      },
      {
        question: "Which example best represents parallel testing?",
        options: [
          "Login test finishes, then search test starts",
          "Login and search tests run at the same time",
          "Only smoke tests are executed",
          "The same browser is refreshed repeatedly",
        ],
        answer: 1,
        explanation: "If login and search execute simultaneously, the execution is parallel.",
      },
    ],
  },
  {
    id: "why-parallel",
    title: "Why do we use parallel execution?",
    category: "Parallel Execution",
    easy:
      "Main reason: time bachana. If 100 tests take 100 minutes one by one, multiple threads can finish them much faster.",
    interview:
      "We use parallel execution to reduce regression execution time, get faster feedback, and use available machine or grid resources efficiently.",
    trick: "Parallel = faster feedback, not better test coverage.",
    followUp: "When should you avoid parallel execution?",
    quiz: [
      {
        question: "What is the biggest benefit of parallel execution?",
        options: [
          "It automatically fixes test failures",
          "It reduces total execution time",
          "It removes the need for assertions",
          "It creates locators automatically",
        ],
        answer: 1,
        explanation: "The main purpose is faster execution and faster feedback.",
      },
      {
        question: "Why do teams usually enable parallel tests in regression suites?",
        options: [
          "To reduce suite runtime",
          "To remove TestNG",
          "To avoid WebDriver",
          "To skip failed tests",
        ],
        answer: 0,
        explanation: "Large regression suites benefit because multiple tests can run concurrently.",
      },
    ],
  },
  {
    id: "testng-parallel",
    title: "How do you run tests in parallel using TestNG?",
    category: "TestNG",
    easy:
      "TestNG me testng.xml file ke suite tag me parallel aur thread-count set karte hain.",
    interview:
      "In TestNG, I configure parallel execution in testng.xml using the parallel attribute and thread-count. Depending on the requirement, I can run tests, classes, or methods in parallel.",
    trick: "Remember two words: parallel + thread-count.",
    code: `<suite name="Regression" parallel="tests" thread-count="3">
  <test name="ChromeTests">
    <classes>
      <class name="tests.LoginTest"/>
    </classes>
  </test>
</suite>`,
    followUp: "Can DataProvider also run in parallel?",
    quiz: [
      {
        question: "Where is TestNG parallel execution commonly configured?",
        options: ["pom.xml", "testng.xml", "web.xml", "application.properties"],
        answer: 1,
        explanation: "TestNG suite-level parallel settings are commonly configured in testng.xml.",
      },
      {
        question: "Which two TestNG settings are commonly used together for parallel runs?",
        options: [
          "priority and groups",
          "parallel and thread-count",
          "enabled and timeout",
          "dependsOnMethods and alwaysRun",
        ],
        answer: 1,
        explanation: "parallel decides the execution level; thread-count limits concurrent threads.",
      },
    ],
  },
  {
    id: "parallel-types",
    title: 'What are parallel="tests", parallel="classes" and parallel="methods"?',
    category: "TestNG",
    easy:
      "tests = alag <test> blocks saath me. classes = alag test classes saath me. methods = @Test methods saath me.",
    interview:
      'parallel="tests" runs <test> tags concurrently, parallel="classes" runs test classes concurrently, and parallel="methods" runs individual @Test methods concurrently.',
    trick: "Tests → XML test blocks, Classes → Java classes, Methods → @Test methods.",
    followUp: "Which mode is safest for an existing framework and why?",
    quiz: [
      {
        question: 'What does parallel="methods" do in TestNG?',
        options: [
          "Runs XML files together",
          "Runs individual test methods concurrently",
          "Runs only failed methods",
          "Runs methods alphabetically",
        ],
        answer: 1,
        explanation: "methods is the finest common parallel level: individual @Test methods can run concurrently.",
      },
      {
        question: 'What does parallel="classes" mainly run concurrently?',
        options: [
          "Different Java test classes",
          "Different Maven projects",
          "Different locators",
          "Different assertions",
        ],
        answer: 0,
        explanation: "classes tells TestNG to execute different test classes in parallel.",
      },
    ],
  },
  {
    id: "thread-count",
    title: "What is thread-count in TestNG?",
    category: "TestNG",
    easy:
      "thread-count tells TestNG ki ek time par maximum kitne worker threads use karne hain.",
    interview:
      "thread-count defines the maximum number of threads TestNG can use for the configured parallel execution.",
    trick: "thread-count = kitni lanes ek saath open hain.",
    code: `<suite name="Regression" parallel="methods" thread-count="4">`,
    followUp: "Should thread-count always be very high?",
    quiz: [
      {
        question: "What does thread-count control?",
        options: [
          "Maximum concurrent worker threads",
          "Number of assertions",
          "Browser timeout",
          "Number of test retries",
        ],
        answer: 0,
        explanation: "thread-count controls how many parallel worker threads TestNG may use.",
      },
      {
        question: 'If thread-count="4", what is the intended idea?',
        options: [
          "Exactly four tests must exist",
          "Up to four worker threads can be used",
          "Each test retries four times",
          "Four browsers are installed",
        ],
        answer: 1,
        explanation: "The setting allows up to four worker threads for the chosen parallel mode.",
      },
    ],
  },
  {
    id: "parallel-problems",
    title: "What problems can occur during parallel execution?",
    category: "Framework",
    easy:
      "Agar tests same driver, same test data, same file ya same account share karte hain to tests ek dusre ko disturb kar sakte hain.",
    interview:
      "Common problems are shared WebDriver conflicts, race conditions, shared test-data collisions, non-thread-safe reports, static variable issues, and flaky tests caused by shared state.",
    trick: "Parallel problem = shared cheezon ka clash.",
    followUp: "How do you identify whether a failure is caused by concurrency?",
    quiz: [
      {
        question: "Which is a common parallel execution problem?",
        options: [
          "Shared mutable state causing race conditions",
          "Java becoming interpreted",
          "XPath syntax changing automatically",
          "Selenium removing waits",
        ],
        answer: 0,
        explanation: "Concurrent tests can clash when they share mutable objects, files, accounts, or drivers.",
      },
      {
        question: "Two tests update the same test account at the same time and fail randomly. What is this closest to?",
        options: [
          "A shared test-data collision",
          "A compile-time error",
          "A locator strategy",
          "A browser installation issue",
        ],
        answer: 0,
        explanation: "Both tests are competing for the same data, so the shared state creates unstable behavior.",
      },
    ],
  },
  {
    id: "dont-share-driver",
    title: "Why should WebDriver not be shared between parallel tests?",
    category: "WebDriver",
    easy:
      "Ek driver ko 2 tests use karenge to ek test page change karega aur dusra test kisi aur page par action karne lagega. Driver state mix ho jayegi.",
    interview:
      "A WebDriver instance maintains browser session state and is not safe to share across concurrent tests. Each parallel thread should use its own driver instance.",
    trick: "One thread = one driver.",
    followUp: "What happens if driver is static in a parallel framework?",
    quiz: [
      {
        question: "Why is one shared WebDriver risky in parallel tests?",
        options: [
          "Tests can overwrite each other's browser state",
          "WebDriver cannot open URLs",
          "TestNG blocks static variables",
          "Selenium allows only one locator",
        ],
        answer: 0,
        explanation: "Navigation, cookies, windows, and element state can interfere when concurrent tests share one session.",
      },
      {
        question: "What is the safer rule for parallel WebDriver execution?",
        options: [
          "One driver per thread",
          "One driver per project",
          "One driver for all suites",
          "No driver cleanup",
        ],
        answer: 0,
        explanation: "Isolating a driver per thread keeps browser sessions independent.",
      },
    ],
  },
  {
    id: "threadlocal",
    title: "What is ThreadLocal<WebDriver>?",
    category: "Java + Selenium",
    easy:
      "ThreadLocal ek box jaisa hai jisme har thread ko apna alag WebDriver milta hai. Same variable name hota hai, but value har thread ki separate hoti hai.",
    interview:
      "ThreadLocal<WebDriver> stores a separate WebDriver instance for each thread, helping isolate browser sessions during parallel execution.",
    trick: "ThreadLocal = thread ka personal locker.",
    followUp: "Why should ThreadLocal.remove() be called?",
    quiz: [
      {
        question: "What is the purpose of ThreadLocal<WebDriver>?",
        options: [
          "Give each thread its own WebDriver instance",
          "Share one driver across every thread",
          "Replace TestNG",
          "Create XPath automatically",
        ],
        answer: 0,
        explanation: "ThreadLocal provides thread-specific storage, so each parallel thread can hold its own driver.",
      },
      {
        question: "Which memory trick best matches ThreadLocal?",
        options: [
          "One personal locker per thread",
          "One global box for all threads",
          "One XML file per locator",
          "One assertion per browser",
        ],
        answer: 0,
        explanation: "Each thread accesses its own stored value, like a personal locker.",
      },
    ],
  },
  {
    id: "threadlocal-implementation",
    title: "How do you implement ThreadLocal for parallel execution?",
    category: "Framework",
    easy:
      "Driver ko ThreadLocal me set karo, getDriver() se current thread ka driver lo, aur test ke end me quit karke remove karo.",
    interview:
      "I keep the driver in a ThreadLocal, set a new driver during setup, access it through a getDriver method, then quit and remove it in teardown.",
    trick: "SET → GET → QUIT → REMOVE.",
    code: `private static final ThreadLocal<WebDriver> driver = new ThreadLocal<>();

public static void setDriver(WebDriver webDriver) {
    driver.set(webDriver);
}

public static WebDriver getDriver() {
    return driver.get();
}

public static void unload() {
    WebDriver current = driver.get();
    if (current != null) current.quit();
    driver.remove();
}`,
    followUp: "Why is remove() useful even after quit()?",
    quiz: [
      {
        question: "What is a good ThreadLocal driver lifecycle?",
        options: [
          "set → get → quit → remove",
          "get → remove → set → never quit",
          "share → refresh → static",
          "quit → set → compile",
        ],
        answer: 0,
        explanation: "A thread gets its driver, uses it, then cleans the browser and ThreadLocal reference.",
      },
      {
        question: "Which method retrieves the current thread's value from ThreadLocal?",
        options: ["get()", "wait()", "notify()", "clone()"],
        answer: 0,
        explanation: "ThreadLocal.get() returns the value associated with the current thread.",
      },
    ],
  },
  {
    id: "multi-browser",
    title: "How do you run tests on multiple browsers in parallel?",
    category: "Cross Browser",
    easy:
      "testng.xml me different browser parameters do—Chrome, Firefox, Edge—and un test blocks ko parallel run karao. Har thread apna driver create kare.",
    interview:
      "I pass the browser name through TestNG parameters, create the corresponding WebDriver in setup, and run the test blocks in parallel with an isolated driver per thread.",
    trick: "Parameter decides browser; ThreadLocal keeps browser separate.",
    code: `<suite name="CrossBrowser" parallel="tests" thread-count="3">
  <test name="Chrome"><parameter name="browser" value="chrome"/></test>
  <test name="Firefox"><parameter name="browser" value="firefox"/></test>
  <test name="Edge"><parameter name="browser" value="edge"/></test>
</suite>`,
    followUp: "Where would you create the browser-specific driver?",
    quiz: [
      {
        question: "What is a common TestNG approach for multi-browser parallel testing?",
        options: [
          "Pass browser as a parameter and create separate drivers",
          "Use the same browser session for every thread",
          "Remove testng.xml",
          "Run only one browser and rename it",
        ],
        answer: 0,
        explanation: "Browser parameters plus isolated driver creation let tests run concurrently across browsers.",
      },
      {
        question: "What must remain isolated when Chrome and Firefox run in parallel?",
        options: [
          "Their WebDriver sessions",
          "The Java language",
          "The test method name",
          "The TestNG dependency",
        ],
        answer: 0,
        explanation: "Each browser execution should have its own independent WebDriver session.",
      },
    ],
  },
  {
    id: "parallel-vs-cross-browser",
    title: "Parallel testing vs cross-browser testing?",
    category: "Concept",
    easy:
      "Parallel ka matlab same time. Cross-browser ka matlab different browsers. Dono ek saath bhi ho sakte hain, but same cheez nahi hain.",
    interview:
      "Parallel testing describes how tests are executed—simultaneously. Cross-browser testing describes where they are executed—across different browsers or browser versions.",
    trick: "Parallel = WHEN. Cross-browser = WHERE.",
    followUp: "Can cross-browser testing be sequential?",
    quiz: [
      {
        question: "Which statement is correct?",
        options: [
          "Parallel tells when; cross-browser tells where",
          "Both terms always mean exactly the same thing",
          "Cross-browser requires parallel execution",
          "Parallel execution requires different browsers",
        ],
        answer: 0,
        explanation: "Parallel is about concurrency; cross-browser is about browser coverage.",
      },
      {
        question: "Can cross-browser testing run sequentially?",
        options: ["Yes", "No, it must always be parallel", "Only in JavaScript", "Only without TestNG"],
        answer: 0,
        explanation: "Cross-browser tests can run one browser after another or in parallel.",
      },
    ],
  },
  {
    id: "thread-safe-framework",
    title: "How do you make your automation framework thread-safe?",
    category: "Framework",
    easy:
      "Har test ka driver alag rakho, shared static data avoid karo, test data isolate karo, aur reporting/logging ko thread-safe banao.",
    interview:
      "I make the framework thread-safe by isolating WebDriver per thread, avoiding mutable static state, using independent test data, keeping page objects scoped correctly, and using thread-safe reporting and cleanup.",
    trick: "Isolate Driver + Data + State + Report.",
    followUp: "Which static variables are safe and which are risky?",
    quiz: [
      {
        question: "Which change most helps make a Selenium framework thread-safe?",
        options: [
          "Isolate driver and mutable test state per thread",
          "Make every driver a single static field",
          "Share the same user account in all tests",
          "Remove teardown methods",
        ],
        answer: 0,
        explanation: "Isolation prevents one concurrent test from changing another test's state.",
      },
      {
        question: "Which item is most risky to share as mutable state in parallel tests?",
        options: [
          "A single static WebDriver",
          "A constant string",
          "An immutable URL constant",
          "A final timeout value",
        ],
        answer: 0,
        explanation: "A shared mutable WebDriver session can be changed concurrently by multiple tests.",
      },
    ],
  },
];

function rotateItems<T>(items: T[], amount: number) {
  if (!items.length) return items;
  const shift = ((amount % items.length) + items.length) % items.length;
  return [...items.slice(shift), ...items.slice(0, shift)];
}

function makeBankTopics(text: string): Topic[] {
  let category = "";
  const base: Array<Omit<Topic, "quiz">> = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      category = heading[1].trim();
      continue;
    }

    const match = line.match(/^(\d+)\.\s+(.+)$/);
    if (!match || !category) continue;

    const numericId = Number(match[1]);
    const answer = ANSWERS[numericId];
    if (!answer) continue;

    base.push({
      id: "q-" + numericId,
      title: match[2].replaceAll(String.fromCharCode(96), ""),
      category,
      easy: answer.easy,
      interview: answer.interview,
      trick: answer.trick,
      code: answer.code,
    });
  }

  return base.map((topic) => {
    const numericId = Number(topic.id.replace("q-", ""));
    const candidates = rotateItems(
      base.filter(
        (candidate) =>
          candidate.category === topic.category && candidate.id !== topic.id
      ),
      numericId
    );
    const distractors: string[] = [];

    for (const candidate of candidates) {
      if (candidate.easy !== topic.easy && !distractors.includes(candidate.easy)) {
        distractors.push(candidate.easy);
      }
      if (distractors.length === 3) break;
    }

    const rawOptions = [topic.easy, ...distractors].slice(0, 4);
    const options = rotateItems(rawOptions, numericId);
    const answerIndex = options.indexOf(topic.easy);

    return {
      ...topic,
      quiz: [
        {
          question: topic.title,
          options,
          answer: answerIndex,
          explanation: topic.interview,
        },
      ],
    };
  });
}

type StoredState = {
  learnedAt: Record<string, string>;
  weak: Record<string, number>;
  attempts: number;
};

const STORAGE_KEY = "qa-trainer-v1";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): StoredState {
  if (typeof window === "undefined") {
    return { learnedAt: {}, weak: {}, attempts: 0 };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Partial<StoredState>;
    return {
      learnedAt: parsed.learnedAt ?? {},
      weak: parsed.weak ?? {},
      attempts: parsed.attempts ?? 0,
    };
  } catch {
    return { learnedAt: {}, weak: {}, attempts: 0 };
  }
}

function normalizeState(value: Partial<StoredState> | null | undefined): StoredState {
  return {
    learnedAt: value?.learnedAt ?? {},
    weak: value?.weak ?? {},
    attempts: Number.isFinite(value?.attempts) ? Math.max(0, Number(value?.attempts)) : 0,
  };
}

function mergeFirstLoginProgress(local: StoredState, cloud: StoredState): StoredState {
  const learnedAt = { ...cloud.learnedAt };
  for (const [id, date] of Object.entries(local.learnedAt)) {
    if (!learnedAt[id]) learnedAt[id] = date;
  }

  const weak = { ...cloud.weak };
  for (const [id, count] of Object.entries(local.weak)) {
    weak[id] = Math.max(weak[id] ?? 0, count);
  }

  return {
    learnedAt,
    weak,
    attempts: Math.max(local.attempts, cloud.attempts),
  };
}

export default function QATrainerPage() {
  const [stored, setStored] = useState<StoredState>({
    learnedAt: {},
    weak: {},
    attempts: 0,
  });
  const [hydrated, setHydrated] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"loading" | "synced" | "offline">("loading");
  const [bankTopics, setBankTopics] = useState<Topic[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All Questions");
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [screen, setScreen] = useState<"learn" | "quiz" | "result">("learn");
  const [scope, setScope] = useState<"today" | "all" | "weak">("all");
  const [quizIds, setQuizIds] = useState<string[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const allTopics = useMemo(
    () => [...bankTopics, ...CORE_TOPICS],
    [bankTopics]
  );

  const categories = useMemo(
    () => [
      "All Questions",
      ...Array.from(new Set(allTopics.map((topic) => topic.category))),
    ],
    [allTopics]
  );

  useEffect(() => {
    const local = loadState();
    setStored(local);
    setHydrated(true);

    void fetch("/qa-questions.txt")
      .then((response) => {
        if (!response.ok) throw new Error("Question bank failed to load");
        return response.text();
      })
      .then((text) => setBankTopics(makeBankTopics(text)))
      .catch(() => setBankTopics([]));

    void (async () => {
      try {
        const response = await fetch("/api/qa-progress", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("Progress sync unavailable");

        const data = (await response.json()) as {
          userId: string;
          state?: Partial<StoredState>;
        };

        const cloud = normalizeState(data.state);
        const migrationKey = `qa-trainer-cloud-migrated:${data.userId}`;
        const alreadyMigrated = localStorage.getItem(migrationKey) === "1";
        const next = alreadyMigrated
          ? cloud
          : mergeFirstLoginProgress(local, cloud);

        setStored(next);

        if (!alreadyMigrated) {
          const saveResponse = await fetch("/api/qa-progress", {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          });
          if (!saveResponse.ok) throw new Error("Initial progress migration failed");
          localStorage.setItem(migrationKey, "1");
        }

        setCloudReady(true);
        setSyncStatus("synced");
      } catch {
        setCloudReady(false);
        setSyncStatus("offline");
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [stored, hydrated]);

  useEffect(() => {
    if (!hydrated || !cloudReady) return;

    setSyncStatus("loading");
    const timer = window.setTimeout(() => {
      void fetch("/api/qa-progress", {
        method: "PUT",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stored),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Progress save failed");
          setSyncStatus("synced");
        })
        .catch(() => setSyncStatus("offline"));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [stored, hydrated, cloudReady]);

  const learnedIds = useMemo(
    () => allTopics.filter((topic) => stored.learnedAt[topic.id]).map((topic) => topic.id),
    [allTopics, stored.learnedAt]
  );

  const todayIds = useMemo(() => {
    const today = todayKey();
    return learnedIds.filter((id) => stored.learnedAt[id] === today);
  }, [learnedIds, stored.learnedAt]);

  const weakIds = useMemo(
    () => learnedIds.filter((id) => (stored.weak[id] ?? 0) > 0),
    [learnedIds, stored.weak]
  );

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTopics.filter((topic) => {
      const inCategory =
        selectedCategory === "All Questions" ||
        topic.category === selectedCategory;
      if (!inCategory) return false;
      if (!q) return true;

      return (
        topic.title.toLowerCase().includes(q) ||
        topic.category.toLowerCase().includes(q) ||
        topic.easy.toLowerCase().includes(q) ||
        topic.interview.toLowerCase().includes(q)
      );
    });
  }, [allTopics, search, selectedCategory]);

  const progress = allTopics.length
    ? Math.round((learnedIds.length / allTopics.length) * 100)
    : 0;

  function markLearned(id: string) {
    setStored((current) => ({
      ...current,
      learnedAt: {
        ...current.learnedAt,
        [id]: current.learnedAt[id] || todayKey(),
      },
    }));
  }

  function unmarkLearned(id: string) {
    setStored((current) => {
      const learnedAt = { ...current.learnedAt };
      const weak = { ...current.weak };
      delete learnedAt[id];
      delete weak[id];
      return { ...current, learnedAt, weak };
    });
  }

  function poolFor(selectedScope: "today" | "all" | "weak") {
    if (selectedScope === "today") return todayIds;
    if (selectedScope === "weak") return weakIds;
    return learnedIds;
  }

  function startQuiz(selectedScope = scope) {
    const pool = poolFor(selectedScope);
    if (!pool.length) return;

    // Coverage first: every eligible learned topic appears exactly once in the
    // session. New attempts rotate the order and alternate question variants.
    const shift = stored.attempts % pool.length;
    const rotated = [...pool.slice(shift), ...pool.slice(0, shift)];
    setScope(selectedScope);
    setQuizIds(rotated);
    setQuizIndex(0);
    setAnswers({});
    setScreen("quiz");
  }

  const currentTopic = allTopics.find((topic) => topic.id === quizIds[quizIndex]);
  const variantIndex = currentTopic ? stored.attempts % currentTopic.quiz.length : 0;
  const currentQuiz = currentTopic?.quiz[variantIndex];

  function chooseAnswer(optionIndex: number) {
    if (!currentTopic || answers[currentTopic.id] !== undefined) return;
    setAnswers((current) => ({ ...current, [currentTopic.id]: optionIndex }));
  }

  function nextQuestion() {
    if (quizIndex < quizIds.length - 1) {
      setQuizIndex((value) => value + 1);
      return;
    }

    const newWeak = { ...stored.weak };
    quizIds.forEach((id) => {
      const topic = allTopics.find((item) => item.id === id);
      if (!topic) return;
      const q = topic.quiz[stored.attempts % topic.quiz.length];
      const selected = answers[id];
      if (selected === q.answer) {
        newWeak[id] = Math.max(0, (newWeak[id] ?? 0) - 1);
      } else {
        newWeak[id] = (newWeak[id] ?? 0) + 1;
      }
    });

    setStored((current) => ({
      ...current,
      weak: newWeak,
      attempts: current.attempts + 1,
    }));
    setScreen("result");
  }

  const correctCount = useMemo(() => {
    return quizIds.reduce((total, id) => {
      const topic = allTopics.find((item) => item.id === id);
      if (!topic) return total;
      const q = topic.quiz[stored.attempts % topic.quiz.length];
      return total + (answers[id] === q.answer ? 1 : 0);
    }, 0);
  }, [allTopics, answers, quizIds, stored.attempts]);

  const resultPercent = quizIds.length
    ? Math.round((correctCount / quizIds.length) * 100)
    : 0;

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-slate-950 text-white grid place-items-center">
        <div className="animate-pulse text-sm text-white/60">Loading your trainer…</div>
      </main>
    );
  }

  if (screen === "quiz" && currentTopic && currentQuiz) {
    const selected = answers[currentTopic.id];
    const answered = selected !== undefined;
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#312e81_0,_#0f172a_42%,_#020617_100%)] text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
          <button
            onClick={() => setScreen("learn")}
            className="mb-5 text-sm font-semibold text-white/65 hover:text-white"
          >
            ← Back to learning
          </button>

          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                {scope === "today" ? "Today Quiz" : scope === "weak" ? "Weak Topics" : "All Learned"}
              </p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">Question {quizIndex + 1} of {quizIds.length}</h1>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
              {Math.round(((quizIndex + (answered ? 1 : 0)) / quizIds.length) * 100)}%
            </div>
          </div>

          <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all"
              style={{ width: `${((quizIndex + (answered ? 1 : 0)) / quizIds.length) * 100}%` }}
            />
          </div>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-300">
              <Brain size={15} /> {currentTopic.category}
            </div>
            <h2 className="text-xl font-extrabold leading-snug sm:text-2xl">{currentQuiz.question}</h2>

            <div className="mt-6 space-y-3">
              {currentQuiz.options.map((option, index) => {
                const isSelected = selected === index;
                const isCorrect = index === currentQuiz.answer;
                const stateClass = !answered
                  ? "border-white/10 bg-white/5 hover:border-cyan-300/50 hover:bg-white/10"
                  : isCorrect
                    ? "border-emerald-400/70 bg-emerald-400/15"
                    : isSelected
                      ? "border-rose-400/70 bg-rose-400/15"
                      : "border-white/10 bg-white/[0.03] opacity-60";
                return (
                  <button
                    key={option}
                    onClick={() => chooseAnswer(index)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${stateClass}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-black/20 text-sm font-black">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="pt-1 text-sm font-semibold sm:text-base">{option}</span>
                    {answered && isCorrect && <CheckCircle2 className="ml-auto shrink-0 text-emerald-300" size={20} />}
                    {answered && isSelected && !isCorrect && <XCircle className="ml-auto shrink-0 text-rose-300" size={20} />}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-relaxed text-cyan-50">
                <span className="font-black">Why:</span> {currentQuiz.explanation}
              </div>
            )}

            <button
              onClick={nextQuestion}
              disabled={!answered}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-4 font-black text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {quizIndex === quizIds.length - 1 ? "Finish Quiz" : "Next Question →"}
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (screen === "result") {
    const label =
      resultPercent >= 90
        ? "Interview Ready"
        : resultPercent >= 75
          ? "Good Progress"
          : resultPercent >= 60
            ? "Keep Practising"
            : "Revision Needed";

    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#164e63_0,_#0f172a_45%,_#020617_100%)] px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.08] p-6 text-center shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-amber-300 to-orange-400 text-slate-950 shadow-xl">
              <Trophy size={36} />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Quiz Complete</p>
            <h1 className="mt-2 text-5xl font-black">{resultPercent}%</h1>
            <p className="mt-2 text-lg font-bold text-white/80">{label}</p>
            <p className="mt-3 text-sm text-white/55">
              {correctCount} correct out of {quizIds.length}. Wrong topics are automatically added to Weak Topics.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                onClick={() => setScreen("learn")}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-bold hover:bg-white/10"
              >
                Back to Learn
              </button>
              <button
                onClick={() => startQuiz(scope)}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 font-black text-slate-950"
              >
                New Cycle
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_#312e81_0,_#111827_40%,_#020617_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-200">
                <Sparkles size={14} /> QA Interview Trainer
              </div>
              <h1 className="max-w-3xl text-2xl font-black tracking-tight sm:text-4xl">
                Learn like a story.
                <span className="block bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
                  Answer like an interviewer expects.
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
                Simple explanation → interview answer → mark learned → quiz. Only learned questions enter your quiz.
              </p>
              <p className="mt-2 text-xs font-semibold text-white/40">
                {syncStatus === "synced"
                  ? "✓ Progress synced to your account"
                  : syncStatus === "loading"
                    ? "Saving progress…"
                    : "Cloud sync temporarily unavailable — local progress is still safe on this device"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Stat icon={<BookOpen size={17} />} value={`${learnedIds.length}/${allTopics.length}`} label="Learned" />
              <Stat icon={<Target size={17} />} value={`${progress}%`} label="Progress" />
              <Stat icon={<Flame size={17} />} value={String(weakIds.length)} label="Weak" />
            </div>
          </div>

          <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[1fr_320px]">
        <section className="lg:order-first">
          <div className="sticky top-0 z-30 mb-5 space-y-3 border-b border-white/5 bg-slate-950/95 py-3 backdrop-blur-xl">
            <div className="w-full">
              <label className="mb-1.5 block px-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                Category
              </label>
              <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900 focus-within:border-cyan-300/40">
                <select
                  value={selectedCategory}
                  onChange={(event) => {
                    setSelectedCategory(event.target.value);
                    setOpenId(null);
                  }}
                  aria-label="Choose interview category"
                  className="h-12 w-full min-w-0 appearance-none bg-transparent pl-4 pr-12 text-sm font-bold text-white outline-none"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/45"
                />
              </div>
            </div>

            <div className="w-full">
              <label className="mb-1.5 block px-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                Search
              </label>
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search a question…"
                  className="h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] pl-11 pr-4 text-sm outline-none transition placeholder:text-white/30 focus:border-cyan-300/40"
                />
              </div>
            </div>
          </div>

          <div className="mb-3 flex min-w-0 items-center justify-between gap-3 px-1 text-xs text-white/40">
            <span className="shrink-0">{filteredTopics.length} questions</span>
            <span className="min-w-0 truncate text-right">Tap a question to study</span>
          </div>

          <div className="space-y-3">
            {filteredTopics.map((topic, index) => {
              const open = openId === topic.id;
              const learned = Boolean(stored.learnedAt[topic.id]);
              const weak = (stored.weak[topic.id] ?? 0) > 0;
              return (
                <article
                  key={topic.id}
                  className={`overflow-hidden rounded-3xl border transition ${open ? "border-violet-400/30 bg-white/[0.07]" : "border-white/8 bg-white/[0.035] hover:bg-white/[0.055]"}`}
                >
                  <button
                    onClick={() => setOpenId(open ? null : topic.id)}
                    className="flex w-full items-start gap-3 p-4 text-left sm:p-5"
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-black ${learned ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-white/70"}`}>
                      {learned ? <Check size={18} /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300/80">{topic.category}</span>
                        {weak && <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">Needs revision</span>}
                      </span>
                      <span className="block font-bold leading-snug sm:text-lg">{topic.title}</span>
                    </span>
                    {open ? <ChevronUp className="mt-2 shrink-0 text-white/40" size={20} /> : <ChevronDown className="mt-2 shrink-0 text-white/40" size={20} />}
                  </button>

                  {open && (
                    <div className="border-t border-white/8 px-4 pb-5 pt-4 sm:px-5">
                      <LearningBlock
                        icon={<Brain size={17} />}
                        title="Easy samjho"
                        body={topic.easy}
                        tone="cyan"
                      />
                      <LearningBlock
                        icon={<Mic2 size={17} />}
                        title="Interview me bolo"
                        body={topic.interview}
                        tone="violet"
                      />
                      {topic.trick && (
                        <LearningBlock
                          icon={<Lightbulb size={17} />}
                          title="Yaad rakhne ki trick"
                          body={topic.trick}
                          tone="amber"
                        />
                      )}
                      {topic.code && (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300">
                            <Code2 size={15} /> Small example
                          </div>
                          <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-emerald-50 sm:text-sm">
                            <code>{topic.code}</code>
                          </pre>
                        </div>
                      )}
                      {topic.followUp && (
                        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/65">
                          <span className="font-black text-white">Follow-up:</span> {topic.followUp}
                        </div>
                      )}

                      <button
                        onClick={() => (learned ? unmarkLearned(topic.id) : markLearned(topic.id))}
                        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${learned ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950"}`}
                      >
                        {learned ? <CheckCircle2 size={17} /> : <BookOpen size={17} />}
                        {learned ? "Learned ✓" : "Mark as Learned"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-cyan-400/10 p-5">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10">
                <Brain size={20} className="text-cyan-300" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white/40">Your quiz pool</p>
                <p className="font-black">{learnedIds.length} learned questions</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-white/50">
              No random repeats inside a cycle. Every eligible learned question appears once before the next cycle.
            </p>

            <div className="mt-4 grid gap-2">
              <QuizButton
                title="All Learned"
                subtitle={`${learnedIds.length} questions`}
                disabled={!learnedIds.length}
                active={scope === "all"}
                onClick={() => setScope("all")}
              />
              <QuizButton
                title="Today Only"
                subtitle={`${todayIds.length} questions`}
                disabled={!todayIds.length}
                active={scope === "today"}
                onClick={() => setScope("today")}
              />
              <QuizButton
                title="Weak Questions"
                subtitle={`${weakIds.length} questions`}
                disabled={!weakIds.length}
                active={scope === "weak"}
                onClick={() => setScope("weak")}
              />
            </div>

            <button
              onClick={() => startQuiz()}
              disabled={!poolFor(scope).length}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-black text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Play size={16} fill="currentColor" /> Start Full Quiz
            </button>
          </section>

          <section className="hidden rounded-3xl border border-white/8 bg-white/[0.035] p-5 lg:block">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-violet-300" />
              <h2 className="font-black">How it works</h2>
            </div>
            <ol className="space-y-3 text-sm text-white/60">
              <li><b className="text-white">1.</b> Read the easy explanation.</li>
              <li><b className="text-white">2.</b> Learn the interview-ready line.</li>
              <li><b className="text-white">3.</b> Mark it as learned.</li>
              <li><b className="text-white">4.</b> Quiz uses only your learned topics.</li>
              <li><b className="text-white">5.</b> Wrong answers become weak topics.</li>
            </ol>
          </section>

          {stored.attempts > 0 && (
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setStored({ learnedAt: {}, weak: {}, attempts: 0 });
                setScreen("learn");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 py-3 text-xs font-bold text-white/40 hover:text-white/70"
            >
              <RotateCcw size={14} /> Reset practice data
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-[88px] rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-cyan-300">{icon}<span className="text-lg font-black text-white">{value}</span></div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

function LearningBlock({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "cyan" | "violet" | "amber";
}) {
  const tones = {
    cyan: "border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200",
    violet: "border-violet-300/15 bg-violet-300/[0.07] text-violet-200",
    amber: "border-amber-300/15 bg-amber-300/[0.07] text-amber-200",
  };

  return (
    <div className={`mb-3 rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
        {icon} {title}
      </div>
      <p className="text-sm leading-relaxed text-white/75 sm:text-[15px]">{body}</p>
    </div>
  );
}

function QuizButton({
  title,
  subtitle,
  disabled,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  disabled: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-30 ${active ? "border-cyan-300/40 bg-cyan-300/10" : "border-white/8 bg-black/10 hover:bg-white/5"}`}
    >
      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="text-[11px] text-white/40">{subtitle}</span>
      </span>
      {active && <Check size={16} className="text-cyan-300" />}
    </button>
  );
}
