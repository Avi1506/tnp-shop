"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  MessagesSquare,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { QaTabs } from "../components/QaTabs";

type InterviewItem = {
  id: string;
  category: string;
  question: string;
  checks: string;
  structure: string[];
  sample: string;
  avoid?: string;
};

const ITEMS: InterviewItem[] = [
  {
    id: "intro",
    category: "Basic HR",
    question: "Tell me about yourself.",
    checks: "Can you introduce yourself clearly, briefly, and relevantly?",
    structure: ["Experience", "Current role/project", "Main automation skills", "What you are looking for next"],
    sample: "I am an Automation QA Engineer with around four years of experience. In my current role, I work on a web-based project where I maintain and execute automation suites, debug failures, fix framework issues, and support regression testing. I mainly work with Java, Selenium, TestNG, Maven, Git, and CI tools, and I am also building my Playwright skills. I am now looking for a role where I can take more ownership of automation and solve more challenging quality problems.",
    avoid: "Do not start with personal/family details. Keep it job-focused and around 60–90 seconds.",
  },
  {
    id: "current-role",
    category: "Basic HR",
    question: "What are your current roles and responsibilities?",
    checks: "Do you really understand and own your day-to-day work?",
    structure: ["Framework maintenance", "Execution", "Debugging", "Regression/reporting", "Team collaboration"],
    sample: "My main responsibility is to maintain the existing automation framework, execute regression batches, analyze failures, debug locator or synchronization issues, fix script problems, and rerun the affected suite. I also share execution results with the team and help junior members when they need support with the framework or debugging.",
  },
  {
    id: "project",
    category: "Basic HR",
    question: "Explain your current project.",
    checks: "Can you explain domain, product, users, and your contribution without getting lost in details?",
    structure: ["Domain", "What the application does", "Who uses it", "Your testing scope", "Automation stack"],
    sample: "I work on a web application in the education domain. My responsibility is mainly automation and regression testing. We validate important user workflows and content-related functionality, and I maintain the automation suite used for repeated regression runs. My stack includes Java, Selenium WebDriver, TestNG, Maven, Git, and CI-based execution.",
  },
  {
    id: "why-testing",
    category: "Basic HR",
    question: "Why did you choose software testing?",
    checks: "Do you have a sensible reason beyond 'I got the job'?",
    structure: ["Interest in quality/problem solving", "Debugging mindset", "Automation interest"],
    sample: "I like finding the reason behind failures and checking whether a system behaves correctly from the user's point of view. Over time, I became more interested in automation because it combines testing with coding and lets us create faster, repeatable regression coverage.",
  },
  {
    id: "job-change",
    category: "Basic HR",
    question: "Why are you looking for a job change?",
    checks: "Are you moving for growth rather than only complaining about your current company?",
    structure: ["Positive reason", "Growth", "More ownership/challenge", "Avoid negativity"],
    sample: "I am looking for a role where I can work on broader automation challenges, take more ownership of framework improvements, and continue growing with modern tools such as Playwright and API automation. I am grateful for what I have learned in my current role, but I now want the next level of responsibility.",
  },
  {
    id: "why-hire",
    category: "Basic HR",
    question: "Why should we hire you?",
    checks: "Can you connect your experience to the role?",
    structure: ["Relevant experience", "Debugging ability", "Framework knowledge", "Learning attitude"],
    sample: "I already have hands-on experience maintaining automation suites, debugging failures, and supporting regression execution. I am comfortable with Java, Selenium, TestNG, and framework-level troubleshooting, and I am actively expanding into Playwright. I can contribute from day one while still learning the specific product and processes of the team.",
  },
  {
    id: "strength",
    category: "Basic HR",
    question: "What is your biggest strength?",
    checks: "Can you give a strength that is useful and supported by an example?",
    structure: ["One strength", "Short example", "Impact"],
    sample: "One of my strengths is debugging. When an automation batch fails, I do not immediately assume the application is wrong. I first isolate the failing step, check logs, locator state, waits, data, and environment, then identify whether it is a script issue or a product defect. This helps reduce unnecessary defect reports and speeds up fixes.",
  },
  {
    id: "weakness",
    category: "Basic HR",
    question: "What is your weakness?",
    checks: "Are you self-aware and actively improving?",
    structure: ["Real but manageable weakness", "What you are doing to improve", "No role-breaking weakness"],
    sample: "Earlier I used to spend too much time trying to perfect a solution before sharing progress. I have improved this by communicating blockers earlier and sharing an initial working solution first, then refining it based on feedback.",
    avoid: "Avoid saying 'I have no weakness' or naming something critical to the role such as 'I cannot debug'.",
  },
  {
    id: "achievement",
    category: "Basic HR",
    question: "What is your biggest professional achievement?",
    checks: "Can you show impact, not just activity?",
    structure: ["Situation", "Your action", "Result"],
    sample: "One achievement I am proud of is stabilizing a set of automation tests that were frequently failing because of synchronization and locator issues. I analyzed the failure patterns, replaced brittle locators, improved waits, and retested the affected regression flow. The suite became more reliable and required less manual investigation after each run.",
  },
  {
    id: "five-years",
    category: "Basic HR",
    question: "Where do you see yourself in the next 3–5 years?",
    checks: "Do your goals fit a realistic automation career path?",
    structure: ["Deeper automation expertise", "Ownership", "Mentoring/architecture"],
    sample: "I want to become a stronger automation engineer who can design and improve frameworks, work confidently with UI and API automation, and contribute to CI/CD quality gates. I also want to take more ownership of technical decisions and mentor junior engineers as I gain experience.",
  },
  {
    id: "framework",
    category: "Project & Automation",
    question: "Explain your automation framework.",
    checks: "Do you understand the framework beyond writing test cases?",
    structure: ["Test layer", "Page objects", "Driver/config", "Utilities", "Data", "Reports/CI"],
    sample: "Our framework separates test cases from reusable page actions and utilities. Test classes contain the scenario flow, page objects manage locators and page-specific actions, driver setup controls browser creation, and common utilities handle waits, screenshots, data, and other repeated operations. TestNG manages execution and grouping, Maven manages dependencies, and results are shared through reports and CI runs.",
  },
  {
    id: "failure-debug",
    category: "Project & Automation",
    question: "What do you do when an automation test fails?",
    checks: "Do you have a systematic debugging process?",
    structure: ["Find exact step", "Inspect error/evidence", "Reproduce", "Check script vs app", "Fix and rerun"],
    sample: "I first find the exact failing step and check the exception, screenshot, and logs. Then I reproduce the same flow and verify the locator, synchronization, test data, browser state, and environment. If the application behavior is wrong manually as well, I raise a defect; otherwise I fix the script and rerun the affected tests before the broader regression.",
  },
  {
    id: "app-vs-script",
    category: "Project & Automation",
    question: "How do you know whether a failure is a script issue or an application bug?",
    checks: "Can you separate automation noise from real defects?",
    structure: ["Manual reproduction", "Requirement", "Logs/data", "Independent behavior"],
    sample: "I reproduce the same flow manually using the same environment and data, compare the behavior with the requirement, and review the failure evidence. If the incorrect behavior exists independently of the script, it is likely an application defect. If manual behavior is correct, I continue debugging the automation, test data, synchronization, or environment.",
  },
  {
    id: "stale",
    category: "Project & Automation",
    question: "How have you handled a stale element issue?",
    checks: "Can you explain a real technical fix?",
    structure: ["Why stale happened", "DOM changed", "Re-locate", "Wait for right state"],
    sample: "I have seen stale element failures after a page refresh or dynamic DOM update. Instead of keeping the old WebElement reference, I wait for the required state and locate the element again before interacting with it. I also avoid storing dynamic WebElements longer than necessary.",
  },
  {
    id: "dynamic",
    category: "Project & Automation",
    question: "How do you handle dynamic elements?",
    checks: "Can you build maintainable locators?",
    structure: ["Stable attributes", "Relative relationship", "Avoid dynamic IDs", "Wait"],
    sample: "I first look for stable attributes such as id, name, data attributes, label text, or a reliable parent-child relationship. If an attribute is partially dynamic, I use a robust CSS selector or relative XPath. I also use explicit waits when the element is rendered asynchronously.",
  },
  {
    id: "flaky",
    category: "Project & Automation",
    question: "How do you handle flaky tests?",
    checks: "Do you fix root causes instead of hiding failures with retries?",
    structure: ["Identify pattern", "Check waits/locators/data/shared state", "Fix root cause", "Retry only carefully"],
    sample: "I check whether failures are caused by timing, unstable locators, shared test data, environment issues, or dependencies between tests. I use traces, screenshots, and failure patterns to find the cause. I fix synchronization or isolation problems first and use retries only as a controlled diagnostic or CI safeguard.",
  },
  {
    id: "50-failures",
    category: "Project & Automation",
    question: "What would you do if 50 tests suddenly failed?",
    checks: "Can you think at suite level instead of debugging 50 tests one by one?",
    structure: ["Look for common root cause", "Environment/setup", "Recent change", "Fix systemic issue first"],
    sample: "I would not start debugging all 50 individually. I would first check whether they fail at the same setup step, locator, login flow, environment, data dependency, or recent deployment change. If there is a common root cause, I fix or report that first, rerun the suite, and then investigate only the remaining failures.",
  },
  {
    id: "automation-selection",
    category: "Project & Automation",
    question: "How do you decide which test cases should be automated?",
    checks: "Do you understand automation ROI?",
    structure: ["Repeated", "Stable", "Business critical", "Data-driven", "High regression value"],
    sample: "I prioritize stable and repetitive scenarios that are executed frequently, especially critical business flows and regression cases. I also consider data-driven scenarios where automation can cover multiple inputs efficiently. I avoid automating unstable or one-time scenarios when the maintenance cost is higher than the value.",
  },
  {
    id: "playwright",
    category: "Project & Automation",
    question: "Why are you learning Playwright if you already know Selenium?",
    checks: "Are you learning with a practical reason?",
    structure: ["Current Selenium experience", "Modern capabilities", "Broaden toolset"],
    sample: "Selenium has given me a strong base in browser automation and framework concepts. I am learning Playwright because it provides modern capabilities such as auto-waiting, browser contexts, integrated tracing, API support, and a strong test runner. My goal is not to replace what I know, but to become comfortable choosing the right tool for the project.",
  },
  {
    id: "developer-conflict",
    category: "Behavioral",
    question: "What do you do if a developer says your bug is not valid?",
    checks: "Can you collaborate without becoming defensive?",
    structure: ["Evidence", "Requirement", "Reproduce together", "Escalate only if needed"],
    sample: "I share the exact steps, environment, test data, screenshot or logs, and the expected behavior from the requirement. If there is still disagreement, I reproduce it together with the developer and discuss the impact. If the requirement itself is unclear, I involve the product owner or relevant stakeholder rather than treating it as a personal disagreement.",
  },
  {
    id: "deadline",
    category: "Behavioral",
    question: "How do you handle tight deadlines?",
    checks: "Can you prioritize by risk and communicate?",
    structure: ["Prioritize critical coverage", "Split work", "Raise blockers early", "Transparent status"],
    sample: "I first identify the most business-critical areas and make sure those are covered. I split work where possible, avoid spending time on low-risk items before critical ones, and communicate blockers early. If full coverage is not realistic, I clearly explain the remaining risk instead of silently reducing quality.",
  },
  {
    id: "mistake",
    category: "Behavioral",
    question: "Tell me about a mistake you made.",
    checks: "Can you take ownership and learn?",
    structure: ["Small real mistake", "Impact", "Fix", "What changed afterward"],
    sample: "Earlier in my career, I once spent too long debugging a test before checking whether the environment itself was unstable. After realizing the cause, I fixed the immediate issue and changed my debugging checklist to verify environment, data, and application availability earlier. That made my later investigations faster.",
  },
  {
    id: "feedback",
    category: "Behavioral",
    question: "How do you handle negative feedback?",
    checks: "Are you coachable?",
    structure: ["Listen", "Clarify", "Act", "Follow up"],
    sample: "I try not to react defensively. I first understand the exact concern, ask for an example if needed, and then make the required change. After applying the feedback, I check whether the improvement meets the expectation so I do not repeat the same issue.",
  },
  {
    id: "junior",
    category: "Behavioral",
    question: "How do you train or support junior team members?",
    checks: "Can you explain and mentor patiently?",
    structure: ["Explain framework", "Demo", "Small task", "Review", "Gradual ownership"],
    sample: "I normally explain the framework flow with a real example, share my screen to demonstrate how a test runs and how failures are debugged, then give a small task. I review the result, explain improvements, and gradually give more responsibility as the person becomes comfortable.",
  },
  {
    id: "unclear-requirement",
    category: "Behavioral",
    question: "What do you do when a requirement is unclear?",
    checks: "Do you clarify before making assumptions?",
    structure: ["Identify ambiguity", "Ask right stakeholder", "Document decision", "Update tests"],
    sample: "I identify the exact point that is unclear and discuss it with the product owner, business analyst, developer, or relevant stakeholder. I avoid building tests on assumptions. Once the behavior is confirmed, I document it in the test case or team discussion and update the automation accordingly.",
  },
  {
    id: "production-defect",
    category: "Behavioral",
    question: "What if a defect reaches production even though you tested the feature?",
    checks: "Can you respond without blaming others?",
    structure: ["Understand escape", "Impact", "Coverage gap", "Prevent recurrence"],
    sample: "I would first reproduce and understand the production issue, then check why our existing test coverage did not catch it. The reason could be missing data, an environment difference, an untested edge case, or a requirement gap. I would add or improve the relevant test and share the learning with the team so the same type of escape is less likely again.",
  },
  {
    id: "salary",
    category: "Offer & Closing",
    question: "What are your salary expectations?",
    checks: "Can you answer professionally without underselling or sounding rigid?",
    structure: ["Market-based", "Role/responsibility", "Open to discussion"],
    sample: "I am looking for a fair market-aligned package based on the responsibilities of the role, my experience, and the overall compensation structure. I am open to discussing the exact number once I understand the role and expectations in more detail.",
    avoid: "If the recruiter asks for an exact number, give your real target/range. Do not invent a number only to avoid the question.",
  },
  {
    id: "notice",
    category: "Offer & Closing",
    question: "What is your notice period and when can you join?",
    checks: "Are you clear and truthful about availability?",
    structure: ["Exact notice period", "Last working date if known", "Whether early release is possible"],
    sample: "My official notice period is [your actual notice period]. If selected, I can discuss the transition with my current employer and will keep you updated with the earliest realistic joining date.",
  },
  {
    id: "offers",
    category: "Offer & Closing",
    question: "Do you have any other offers or interviews in progress?",
    checks: "Are you transparent without using pressure tactics?",
    structure: ["State facts", "No exaggeration", "Reconfirm interest"],
    sample: "I am exploring a few opportunities, but I am evaluating them based on the role, learning, team, and long-term fit. I am interested in this role because it aligns well with the automation work I want to grow into.",
  },
  {
    id: "questions-for-us",
    category: "Offer & Closing",
    question: "Do you have any questions for us?",
    checks: "Are you genuinely evaluating the role?",
    structure: ["Team", "Automation ownership", "Current challenges", "Success in first months"],
    sample: "Yes. I would like to understand how the QA and development teams work together, what the current automation stack looks like, what the biggest quality challenges are, and what you would expect from the person in this role during the first three to six months.",
  },
];

type Progress = {
  practiced: Record<string, string>;
  attempts: number;
};

export default function InterviewPrepPage() {
  const [progress, setProgress] = useState<Progress>({ practiced: {}, attempts: 0 });
  const [openId, setOpenId] = useState<string | null>("intro");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sync, setSync] = useState<"loading" | "synced" | "error">("loading");

  useEffect(() => {
    void fetch("/api/qa-interview-progress", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("progress");
        const data = (await response.json()) as { state?: Progress };
        setProgress(data.state ?? { practiced: {}, attempts: 0 });
        setSync("synced");
      })
      .catch(() => setSync("error"));
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(ITEMS.map((item) => item.category)))],
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ITEMS.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.sample.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [category, search]);

  async function save(next: Progress) {
    setProgress(next);
    setSync("loading");
    try {
      const response = await fetch("/api/qa-interview-progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("save");
      setSync("synced");
    } catch {
      setSync("error");
    }
  }

  function togglePracticed(id: string) {
    const next = { ...progress, practiced: { ...progress.practiced } };
    if (next.practiced[id]) {
      delete next.practiced[id];
    } else {
      next.practiced[id] = new Date().toISOString();
      next.attempts += 1;
    }
    void save(next);
  }

  const practicedCount = Object.keys(progress.practiced).length;

  return (
    <main className="min-h-screen bg-slate-950 pb-16 text-white">
      <div className="border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_#312e81_0,_#111827_45%,_#020617_100%)]">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-black text-violet-200">
            <MessagesSquare size={14} /> Interview Preparation
          </div>
          <h1 className="mt-3 text-2xl font-black sm:text-4xl">Basic interview questions, properly prepared.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            HR + project + behavioral questions. Read the structure, practise the sample, then speak it in your own words.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Stat label="Prepared" value={`${practicedCount}/${ITEMS.length}`} />
            <Stat label="Practice attempts" value={String(progress.attempts)} />
            <Stat label="Sync" value={sync === "synced" ? "✓" : sync === "loading" ? "…" : "!"} />
          </div>
        </div>
      </div>

      <QaTabs />

      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        <div className="sticky top-16 z-30 mb-5 space-y-3 border-b border-white/5 bg-slate-950/95 py-3 backdrop-blur-xl">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm font-bold outline-none focus:border-cyan-300/40"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search interview question…"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-11 pr-4 text-sm outline-none placeholder:text-white/30 focus:border-cyan-300/40"
            />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between px-1 text-xs text-white/40">
          <span>{filtered.length} questions</span>
          <span>Practise aloud, not word-for-word</span>
        </div>

        <div className="space-y-3">
          {filtered.map((item, index) => {
            const open = openId === item.id;
            const done = Boolean(progress.practiced[item.id]);

            return (
              <article
                key={item.id}
                className={`overflow-hidden rounded-3xl border ${
                  open
                    ? "border-violet-400/30 bg-white/[0.065]"
                    : "border-white/8 bg-white/[0.035]"
                }`}
              >
                <button
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex w-full items-start gap-3 p-4 text-left sm:p-5"
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-black ${
                      done ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {done ? <Check size={18} /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300/75">
                      {item.category}
                    </span>
                    <span className="mt-1 block font-bold leading-snug sm:text-lg">{item.question}</span>
                  </span>
                  {open ? <ChevronUp size={19} className="mt-2 shrink-0 text-white/40" /> : <ChevronDown size={19} className="mt-2 shrink-0 text-white/40" />}
                </button>

                {open && (
                  <div className="border-t border-white/8 px-4 pb-5 pt-4 sm:px-5">
                    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                        <Target size={15} /> What interviewer checks
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-white/75">{item.checks}</p>
                    </section>

                    <section className="mt-3 rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Answer structure</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.structure.map((step, stepIndex) => (
                          <span key={step} className="rounded-full border border-violet-300/15 bg-violet-300/[0.08] px-3 py-1.5 text-xs font-bold text-violet-100">
                            {stepIndex + 1}. {step}
                          </span>
                        ))}
                      </div>
                    </section>

                    <section className="mt-3 rounded-2xl border border-violet-300/15 bg-violet-300/[0.07] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Sample answer</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/80">{item.sample}</p>
                    </section>

                    {item.avoid && (
                      <section className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300">
                          <CircleAlert size={15} /> Avoid
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">{item.avoid}</p>
                      </section>
                    )}

                    <button
                      onClick={() => togglePracticed(item.id)}
                      className={`mt-4 w-full rounded-2xl py-3.5 text-sm font-black ${
                        done
                          ? "border border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                          : "bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950"
                      }`}
                    >
                      {done ? "Practised ✓" : "Mark as Practised"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-5">
          <div className="flex items-center gap-2 text-cyan-300">
            <Sparkles size={17} />
            <h2 className="font-black">Best way to use this tab</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            First read the structure, then close the answer and speak for 60–90 seconds in your own words. After that, use the English Speaking tab for microphone-based practice and scoring.
          </p>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
      <p className="text-lg font-black">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}
