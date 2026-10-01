import { manualAnswers } from "./manual";
import { javaAnswers } from "./java";
import { codingAnswers } from "./coding";
import { seleniumAnswers } from "./selenium";
import { seleniumWaitsAndExceptions, testNgAnswers } from "./selenium-more";
import { frameworkAnswers, devOpsAnswers } from "./framework-devops";
import { apiSqlAnswers } from "./api-sql";
import { realTimeAnswers } from "./real-time";
import { javascriptAnswers } from "./javascript";
import { playwrightAnswers } from "./playwright";

export type StudyAnswer = {
  easy: string;
  interview: string;
  trick?: string;
  code?: string;
};

export const ANSWERS: Record<number, StudyAnswer> = {
  ...manualAnswers,
  ...javaAnswers,
  ...codingAnswers,
  ...seleniumAnswers,
  ...seleniumWaitsAndExceptions,
  ...testNgAnswers,
  ...frameworkAnswers,
  ...devOpsAnswers,
  ...apiSqlAnswers,
  ...realTimeAnswers,
  ...javascriptAnswers,
  ...playwrightAnswers,
};

export type ExtraQuestion = {
  id: number;
  category: string;
  question: string;
  answer: StudyAnswer;
};

export const PARALLEL_DEEP_DIVE: ExtraQuestion[] = [
  {
    id: 1001,
    category: "Parallel Testing Deep Dive",
    question: "What is parallel testing?",
    answer: {
      easy: "Parallel testing means ek se zyada tests same time par run karna instead of one-by-one.",
      interview: "Parallel testing is the simultaneous execution of multiple tests, classes, or test sets using separate threads or workers to reduce overall execution time.",
      trick: "Parallel = same time.",
    },
  },
  {
    id: 1002,
    category: "Parallel Testing Deep Dive",
    question: "Why do we use parallel execution?",
    answer: {
      easy: "Main reason time bachana aur regression result jaldi paana hai.",
      interview: "We use parallel execution to reduce total regression time, get faster feedback, and use available machines or grid capacity efficiently.",
      trick: "More lanes = faster finish.",
    },
  },
  {
    id: 1003,
    category: "Parallel Testing Deep Dive",
    question: "How do you run tests in parallel using TestNG?",
    answer: {
      easy: "testng.xml me parallel mode aur thread-count set karte hain.",
      interview: "In TestNG I configure the suite with the parallel attribute and thread-count, then make sure driver and test state are isolated for each thread.",
      trick: "parallel + thread-count.",
      code: `<suite name="Regression" parallel="tests" thread-count="3">`,
    },
  },
  {
    id: 1004,
    category: "Parallel Testing Deep Dive",
    question: "What is parallel=\"tests\", parallel=\"classes\" and parallel=\"methods\"?",
    answer: {
      easy: "tests = XML test blocks saath me, classes = Java test classes saath me, methods = individual @Test methods saath me.",
      interview: "parallel=tests runs test tags concurrently, parallel=classes runs test classes concurrently, and parallel=methods runs individual test methods concurrently.",
      trick: "Tests → Classes → Methods = bigger to smaller unit.",
    },
  },
  {
    id: 1005,
    category: "Parallel Testing Deep Dive",
    question: "What is thread-count in TestNG?",
    answer: {
      easy: "thread-count maximum worker threads ki limit batata hai.",
      interview: "thread-count defines the maximum number of worker threads TestNG can use for the configured parallel mode.",
      trick: "thread-count = open lanes.",
    },
  },
  {
    id: 1006,
    category: "Parallel Testing Deep Dive",
    question: "What problems can occur during parallel execution?",
    answer: {
      easy: "Shared driver, shared data, static state, same files/accounts aur non-thread-safe reports tests ko clash kara sakte hain.",
      interview: "Common issues include race conditions, shared WebDriver conflicts, shared test-data collisions, mutable static state, reporting conflicts, and flaky tests.",
      trick: "Parallel problem usually starts with shared state.",
    },
  },
  {
    id: 1007,
    category: "Parallel Testing Deep Dive",
    question: "Why should WebDriver not be shared between parallel tests?",
    answer: {
      easy: "Do tests same driver use karenge to ek test ka navigation/action dusre test ki browser state change kar dega.",
      interview: "A WebDriver instance owns mutable browser-session state and should not be shared by concurrent tests; each parallel thread should have its own driver.",
      trick: "One thread = one driver.",
    },
  },
  {
    id: 1008,
    category: "Parallel Testing Deep Dive",
    question: "What is ThreadLocal<WebDriver>?",
    answer: {
      easy: "ThreadLocal har thread ko apna separate WebDriver value deta hai.",
      interview: "ThreadLocal<WebDriver> stores a separate WebDriver instance for each thread, helping isolate browser sessions during parallel execution.",
      trick: "ThreadLocal = personal locker for each thread.",
    },
  },
  {
    id: 1009,
    category: "Parallel Testing Deep Dive",
    question: "How do you implement ThreadLocal for parallel execution?",
    answer: {
      easy: "Setup me driver set karo, tests me getDriver() use karo, teardown me quit karke remove() karo.",
      interview: "I keep WebDriver in a ThreadLocal, set a new instance during setup, access the current thread's driver through a getter, then quit and remove it during teardown.",
      trick: "SET → GET → QUIT → REMOVE.",
      code: `private static final ThreadLocal<WebDriver> driver = new ThreadLocal<>();

public static WebDriver getDriver() {
    return driver.get();
}

public static void unload() {
    WebDriver current = driver.get();
    if (current != null) current.quit();
    driver.remove();
}`,
    },
  },
  {
    id: 1010,
    category: "Parallel Testing Deep Dive",
    question: "How do you run tests on multiple browsers in parallel?",
    answer: {
      easy: "Browser name parameter se Chrome/Firefox/Edge choose karo aur har parallel test/thread ka separate driver create karo.",
      interview: "I pass the browser through TestNG parameters, create the matching WebDriver in setup, and execute the test blocks in parallel with isolated driver instances.",
      trick: "Parameter chooses browser; thread owns driver.",
    },
  },
  {
    id: 1011,
    category: "Parallel Testing Deep Dive",
    question: "Parallel testing vs cross-browser testing?",
    answer: {
      easy: "Parallel means tests kab run hote hain—same time. Cross-browser means tests kahan run hote hain—different browsers.",
      interview: "Parallel testing describes simultaneous execution, while cross-browser testing validates behavior across different browsers or browser versions. They can be used together but are not the same concept.",
      trick: "Parallel = WHEN, Cross-browser = WHERE.",
    },
  },
  {
    id: 1012,
    category: "Parallel Testing Deep Dive",
    question: "How do you make your automation framework thread-safe?",
    answer: {
      easy: "Driver, mutable state aur test data isolate karo; static shared objects avoid karo; reporting aur cleanup thread-safe rakho.",
      interview: "I isolate WebDriver and mutable test state per thread, avoid unsafe static objects, use independent test data, keep page objects correctly scoped, and ensure reporting and teardown are thread-safe.",
      trick: "Isolate Driver + Data + State + Report.",
    },
  },
];