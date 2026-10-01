"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Gauge,
  Mic2,
  RotateCcw,
  Square,
  Timer,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { QaTabs } from "../components/QaTabs";

type Prompt = {
  id: string;
  group: string;
  title: string;
  instruction: string;
  targetSeconds: string;
  keywords: string[];
  starter: string;
};

const PROMPTS: Prompt[] = [
  {
    id: "self-intro",
    group: "Interview English",
    title: "Tell me about yourself.",
    instruction: "Speak for 60–90 seconds. Keep it professional: experience → current role → skills → next goal.",
    targetSeconds: "60–90 sec",
    keywords: ["experience", "automation", "role", "project", "selenium"],
    starter: "I am an Automation QA Engineer with...",
  },
  {
    id: "current-role",
    group: "Interview English",
    title: "Explain your current role and responsibilities.",
    instruction: "Explain what you actually do every day. Use short sentences and clear action words.",
    targetSeconds: "45–75 sec",
    keywords: ["framework", "debug", "regression", "execute", "team"],
    starter: "In my current role, I mainly work on...",
  },
  {
    id: "project",
    group: "Interview English",
    title: "Explain your current project.",
    instruction: "Cover domain, application, your testing scope, and tools without going too deep.",
    targetSeconds: "60–90 sec",
    keywords: ["project", "application", "testing", "automation", "framework"],
    starter: "My current project is in the...",
  },
  {
    id: "job-change",
    group: "Interview English",
    title: "Why are you looking for a job change?",
    instruction: "Keep the answer positive. Talk about growth, responsibility, and learning.",
    targetSeconds: "30–60 sec",
    keywords: ["growth", "automation", "responsibility", "learning"],
    starter: "I am looking for a change because I want to...",
  },
  {
    id: "why-hire",
    group: "Interview English",
    title: "Why should we hire you?",
    instruction: "Connect your experience, debugging ability, automation skills, and learning attitude to the role.",
    targetSeconds: "45–60 sec",
    keywords: ["experience", "automation", "debug", "framework", "learn"],
    starter: "I believe I can contribute to this role because...",
  },
  {
    id: "framework",
    group: "Technical English",
    title: "Explain your automation framework.",
    instruction: "Explain it like you are talking to an interviewer: tests → page objects → utilities → config → reports.",
    targetSeconds: "60–90 sec",
    keywords: ["test", "page", "driver", "utility", "report"],
    starter: "Our automation framework is structured into...",
  },
  {
    id: "stale",
    group: "Technical English",
    title: "Explain StaleElementReferenceException in simple English.",
    instruction: "Define it, explain why it happens, then tell how you fix it.",
    targetSeconds: "30–60 sec",
    keywords: ["element", "dom", "reference", "locate", "wait"],
    starter: "A stale element exception occurs when...",
  },
  {
    id: "parallel",
    group: "Technical English",
    title: "Explain parallel testing.",
    instruction: "Explain what it is, why we use it, and one risk during parallel execution.",
    targetSeconds: "30–60 sec",
    keywords: ["parallel", "same", "time", "thread", "driver"],
    starter: "Parallel testing means...",
  },
  {
    id: "playwright",
    group: "Technical English",
    title: "Why would you use Playwright?",
    instruction: "Mention modern browser automation features instead of saying only that it is faster.",
    targetSeconds: "30–60 sec",
    keywords: ["playwright", "browser", "auto", "wait", "trace"],
    starter: "Playwright is useful for automation because...",
  },
  {
    id: "failure-update",
    group: "Work English",
    title: "Give your team a short automation failure update.",
    instruction: "Imagine a regression run failed. Explain status, reason, action, and next update.",
    targetSeconds: "30–45 sec",
    keywords: ["failed", "issue", "debug", "rerun", "update"],
    starter: "In today's regression run, I found that...",
  },
  {
    id: "bug-developer",
    group: "Work English",
    title: "Explain a bug to a developer.",
    instruction: "Use expected vs actual behavior and keep the tone collaborative.",
    targetSeconds: "30–60 sec",
    keywords: ["expected", "actual", "steps", "issue", "reproduce"],
    starter: "I found an issue in this flow. The expected behavior is...",
  },
  {
    id: "blocker",
    group: "Work English",
    title: "Explain a blocker in a daily meeting.",
    instruction: "State what is blocked, why, what you tried, and what help you need.",
    targetSeconds: "30–45 sec",
    keywords: ["blocked", "because", "tried", "need", "continue"],
    starter: "I am currently blocked on...",
  },
  {
    id: "mentor",
    group: "Work English",
    title: "Explain a test failure to a junior tester.",
    instruction: "Use simple teaching English. Avoid long technical sentences.",
    targetSeconds: "45–75 sec",
    keywords: ["first", "check", "error", "locator", "rerun"],
    starter: "First, we should check exactly where the test failed...",
  },
  {
    id: "daily-routine",
    group: "Everyday English",
    title: "Describe your normal workday.",
    instruction: "Speak naturally from morning to end of work. Focus on smooth sentence connection.",
    targetSeconds: "60–90 sec",
    keywords: ["morning", "work", "meeting", "test", "evening"],
    starter: "My normal workday usually starts with...",
  },
  {
    id: "weekend",
    group: "Everyday English",
    title: "Talk about how you spent your last weekend.",
    instruction: "Use past tense and connect events using then, after that, later, and finally.",
    targetSeconds: "45–75 sec",
    keywords: ["went", "did", "then", "after", "finally"],
    starter: "Last weekend, I...",
  },
  {
    id: "learning",
    group: "Everyday English",
    title: "Explain something new you are learning.",
    instruction: "Say what you are learning, why, what is difficult, and how you practise.",
    targetSeconds: "45–75 sec",
    keywords: ["learning", "because", "practice", "difficult", "improve"],
    starter: "Currently, I am learning...",
  },
];

type SpeakingProgress = {
  sessions: number;
  bestScore: number;
  lastScore: number;
  lastPracticedAt: string | null;
  lastPromptId: string | null;
};

type SpeechAlternativeLike = {
  transcript: string;
  confidence: number;
};

type SpeechResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternativeLike;
};

type SpeechResultListLike = {
  length: number;
  [index: number]: SpeechResultLike;
};

type SpeechEventLike = Event & {
  resultIndex: number;
  results: SpeechResultListLike;
};

type SpeechErrorLike = Event & {
  error?: string;
};

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: SpeechErrorLike) => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => RecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

type Result = {
  score: number;
  words: number;
  wpm: number;
  fillers: number;
  coverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  feedback: string[];
};

const FILLERS = ["um", "uh", "umm", "actually", "basically", "you know", "i mean"];

function countFillers(text: string) {
  const lower = ` ${text.toLowerCase()} `;
  return FILLERS.reduce((total, filler) => {
    const escaped = filler.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
    const matches = lower.match(new RegExp(`\\b${escaped}\\b`, "g"));
    return total + (matches?.length ?? 0);
  }, 0);
}

function evaluate(text: string, seconds: number, prompt: Prompt): Result {
  const cleaned = text.trim();
  const words = cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0;
  const safeSeconds = Math.max(seconds, 1);
  const wpm = Math.round((words / safeSeconds) * 60);
  const fillers = countFillers(cleaned);
  const lower = cleaned.toLowerCase();

  const matchedKeywords = prompt.keywords.filter((keyword) =>
    lower.includes(keyword.toLowerCase())
  );
  const missingKeywords = prompt.keywords.filter(
    (keyword) => !matchedKeywords.includes(keyword)
  );
  const coverage = Math.round((matchedKeywords.length / prompt.keywords.length) * 100);

  let pacePoints = 8;
  if (words >= 20 && wpm >= 85 && wpm <= 160) pacePoints = 25;
  else if (words >= 15 && wpm >= 65 && wpm <= 180) pacePoints = 18;
  else if (words < 15) pacePoints = 5;

  const fillerPoints = Math.max(0, 25 - fillers * 4);
  const coveragePoints = Math.round(coverage * 0.5);
  const score = Math.max(0, Math.min(100, coveragePoints + fillerPoints + pacePoints));

  const feedback: string[] = [];
  if (words < 25) feedback.push("Answer thoda short hai — 2–3 more complete points add karo.");
  if (wpm > 170) feedback.push("Speed fast hai — short pauses lo aur important words clearly bolo.");
  if (wpm > 0 && wpm < 70) feedback.push("Speed slow hai — sentence complete karke natural flow maintain karo.");
  if (fillers > 2) feedback.push("Fillers zyada hain — 'um/uh' ki jagah 1-second pause use karo.");
  if (missingKeywords.length) feedback.push(`Next attempt me include karo: ${missingKeywords.join(", ")}.`);
  if (!feedback.length) feedback.push("Good structure and pace. Ab same answer bina starter dekhe repeat karo.");

  return {
    score,
    words,
    wpm,
    fillers,
    coverage,
    matchedKeywords,
    missingKeywords,
    feedback,
  };
}

export default function SpeakingPracticePage() {
  const [group, setGroup] = useState("Interview English");
  const [promptId, setPromptId] = useState(PROMPTS[0].id);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<SpeakingProgress>({
    sessions: 0,
    bestScore: 0,
    lastScore: 0,
    lastPracticedAt: null,
    lastPromptId: null,
  });

  const recognitionRef = useRef<RecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const finalBufferRef = useRef("");
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const groups = useMemo(
    () => Array.from(new Set(PROMPTS.map((prompt) => prompt.group))),
    []
  );

  const groupPrompts = useMemo(
    () => PROMPTS.filter((prompt) => prompt.group === group),
    [group]
  );

  const prompt =
    PROMPTS.find((item) => item.id === promptId) ??
    groupPrompts[0] ??
    PROMPTS[0];

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    setSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));

    void fetch("/api/qa-speaking-progress", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("progress");
        const data = (await response.json()) as { state?: SpeakingProgress };
        if (data.state) setProgress(data.state);
      })
      .catch(() => undefined);

    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!groupPrompts.some((item) => item.id === promptId)) {
      setPromptId(groupPrompts[0]?.id ?? PROMPTS[0].id);
      setTranscript("");
      setResult(null);
      setSeconds(0);
    }
  }, [group, groupPrompts, promptId]);

  function stopSpeaking() {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (startedAtRef.current) {
      setSeconds(Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    }
  }

  function buildRecognition() {
    const speechWindow = window as SpeechWindow;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return null;

    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      let newFinal = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const value = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) newFinal += value + " ";
        else interim += value;
      }

      if (newFinal) finalBufferRef.current += newFinal;
      setTranscript((finalBufferRef.current + interim).trim());
    };

    recognition.onerror = (event) => {
      const error = event.error ?? "speech-error";
      if (error === "not-allowed" || error === "service-not-allowed") {
        shouldListenRef.current = false;
        setListening(false);
        setMessage("Microphone permission allow karo, then Start Speaking dubara tap karo.");
      } else if (error !== "no-speech" && error !== "aborted") {
        setMessage("Speech recognition temporarily stopped. You can start again.");
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // Browser may still be finishing the previous recognition session.
          }
        }, 150);
      }
    };

    return recognition;
  }

  function startSpeaking() {
    setResult(null);
    setMessage("");
    setTranscript("");
    setSeconds(0);
    finalBufferRef.current = "";
    shouldListenRef.current = true;
    startedAtRef.current = Date.now();

    const recognition = buildRecognition();
    if (!recognition) {
      setSupported(false);
      setMessage("Live speech-to-text is not supported in this browser. Chrome on Android/Desktop works best.");
      return;
    }

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
      timerRef.current = window.setInterval(() => {
        if (!startedAtRef.current) return;
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 120) stopSpeaking();
      }, 500);
    } catch {
      setMessage("Microphone could not start. Check browser permission and try again.");
    }
  }

  async function checkSpeaking() {
    if (!transcript.trim()) {
      setMessage("Pehle 20–30 seconds English me bolo, phir score check karo.");
      return;
    }

    const nextResult = evaluate(transcript, seconds, prompt);
    setResult(nextResult);

    const nextProgress: SpeakingProgress = {
      sessions: progress.sessions + 1,
      bestScore: Math.max(progress.bestScore, nextResult.score),
      lastScore: nextResult.score,
      lastPracticedAt: new Date().toISOString(),
      lastPromptId: prompt.id,
    };
    setProgress(nextProgress);

    void fetch("/api/qa-speaking-progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextProgress),
    }).catch(() => undefined);
  }

  function resetAttempt() {
    if (listening) stopSpeaking();
    setTranscript("");
    setResult(null);
    setSeconds(0);
    setMessage("");
    finalBufferRef.current = "";
    startedAtRef.current = null;
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-16 text-white">
      <div className="border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_#164e63_0,_#111827_45%,_#020617_100%)]">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-200">
            <Mic2 size={14} /> English Speaking Practice
          </div>
          <h1 className="mt-3 text-2xl font-black sm:text-4xl">Speak. See the transcript. Improve the next attempt.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            Free browser-mic practice for interview, technical, work, and everyday English. Score is based on answer coverage, speaking pace, and filler words — not accent.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Stat label="Sessions" value={String(progress.sessions)} />
            <Stat label="Best" value={progress.bestScore ? `${progress.bestScore}%` : "—"} />
            <Stat label="Last" value={progress.lastScore ? `${progress.lastScore}%` : "—"} />
          </div>
        </div>
      </div>

      <QaTabs />

      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 sm:p-5">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Practice type</label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {groups.map((item) => (
              <button
                key={item}
                onClick={() => setGroup(item)}
                className={`rounded-2xl border px-3 py-2.5 text-xs font-black transition ${
                  group === item
                    ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                    : "border-white/8 bg-white/[0.025] text-white/50"
                }`}
              >
                {item.replace(" English", "")}
              </button>
            ))}
          </div>

          <label className="mt-5 block text-[10px] font-black uppercase tracking-widest text-white/40">Question / prompt</label>
          <div className="relative mt-2">
            <select
              value={prompt.id}
              onChange={(event) => {
                setPromptId(event.target.value);
                resetAttempt();
              }}
              className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-900 pl-4 pr-11 text-sm font-bold outline-none focus:border-cyan-300/40"
            >
              {groupPrompts.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-500/10 to-cyan-400/[0.06] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">{prompt.group}</p>
              <h2 className="mt-2 text-xl font-black leading-snug sm:text-2xl">{prompt.title}</h2>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/50">
              {prompt.targetSeconds}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-white/60">{prompt.instruction}</p>

          <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Sentence starter</p>
            <p className="mt-2 text-sm font-semibold text-white/75">{prompt.starter}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {prompt.keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1 text-[11px] font-bold text-cyan-100">
                {keyword}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Your attempt</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-bold text-white/65">
                <Timer size={16} /> {seconds}s
              </p>
            </div>
            {supported === false && (
              <span className="rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-bold text-amber-200">
                Chrome recommended
              </span>
            )}
          </div>

          <div className="mt-4 min-h-32 rounded-2xl border border-white/8 bg-black/25 p-4">
            {transcript ? (
              <p className="text-sm leading-7 text-white/80">{transcript}</p>
            ) : (
              <p className="text-sm leading-7 text-white/30">
                Tap Start Speaking and answer in English. Your transcript will appear here.
              </p>
            )}
          </div>

          {message && (
            <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-3 text-xs leading-relaxed text-amber-100">
              {message}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            {!listening ? (
              <button
                onClick={startSpeaking}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 py-3.5 text-sm font-black text-slate-950"
              >
                <Mic2 size={18} /> Start Speaking
              </button>
            ) : (
              <button
                onClick={stopSpeaking}
                className="flex items-center justify-center gap-2 rounded-2xl bg-rose-400 py-3.5 text-sm font-black text-slate-950"
              >
                <Square size={17} fill="currentColor" /> Stop
              </button>
            )}

            <button
              onClick={resetAttempt}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 text-sm font-bold text-white/65"
            >
              <RotateCcw size={17} /> Reset
            </button>
          </div>

          {!listening && transcript && (
            <button
              onClick={checkSpeaking}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 py-3.5 text-sm font-black text-emerald-200"
            >
              <WandSparkles size={17} /> Check My Speaking
            </button>
          )}
        </section>

        {result && (
          <section className="mt-4 rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.05] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-xl font-black text-slate-950">
                {result.score}%
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Practice score</p>
                <p className="mt-1 text-sm text-white/55">This is a practice metric, not a pronunciation/accent rating.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric icon={<Volume2 size={15} />} label="Words" value={String(result.words)} />
              <Metric icon={<Gauge size={15} />} label="Speed" value={result.wpm ? `${result.wpm} wpm` : "—"} />
              <Metric icon={<Mic2 size={15} />} label="Fillers" value={String(result.fillers)} />
              <Metric icon={<CheckCircle2 size={15} />} label="Coverage" value={`${result.coverage}%`} />
            </div>

            <div className="mt-5 space-y-2">
              {result.feedback.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 p-3 text-sm leading-relaxed text-white/70">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Next round</p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                Same question dobara bolo, but this time sentence starter mat dekho. Target: fewer fillers + missing keywords cover + natural pauses.
              </p>
            </div>
          </section>
        )}

        <section className="mt-4 rounded-3xl border border-white/8 bg-white/[0.025] p-5 text-xs leading-relaxed text-white/45">
          Browser speech recognition support varies. Chrome on Android/Desktop generally works best. The transcript may occasionally mishear words, so use the score as practice guidance rather than an exact language assessment.
        </section>
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

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
      <div className="flex items-center gap-1.5 text-cyan-300">{icon}</div>
      <p className="mt-2 text-base font-black">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}
