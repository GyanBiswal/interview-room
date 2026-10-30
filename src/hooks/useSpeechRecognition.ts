import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// The browser speech recognition API is not in TypeScript's built-in types,
// so we describe the small part we use.
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: RecognitionAlternative;
}
interface RecognitionResultList {
  readonly length: number;
  readonly [index: number]: RecognitionResult;
}
interface RecognitionEvent {
  resultIndex: number;
  results: RecognitionResultList;
}
interface RecognitionErrorEvent {
  error: string;
}
interface RecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => RecognitionInstance;

export type RecognitionProblem =
  | "permission-denied"
  | "no-microphone"
  | "network"
  | "unknown";

function getConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Options {
  lang?: string;
  // Called with each finished chunk of speech.
  onFinalText: (text: string) => void;
}

// Speech-to-text using the browser's recognition service (where supported).
// A pause in speech does NOT finish the answer: if the browser stops
// listening by itself we restart it, until the candidate presses stop.
export function useSpeechRecognition({ lang = "en-IN", onFinalText }: Options) {
  const Ctor = useMemo(() => getConstructor(), []);
  const supported = Ctor !== null;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [problem, setProblem] = useState<RecognitionProblem | null>(null);

  const recRef = useRef<RecognitionInstance | null>(null);
  const wantRef = useRef(false); // does the candidate want us to keep listening?
  const activeRef = useRef(false); // is the browser recognizer running right now?
  const restartTimes = useRef<number[]>([]);
  const waiters = useRef<Array<() => void>>([]);
  const onFinalRef = useRef(onFinalText);

  useEffect(() => {
    onFinalRef.current = onFinalText;
  });

  const start = useCallback(() => {
    if (!Ctor || wantRef.current) return;
    setProblem(null);
    wantRef.current = true;
    restartTimes.current = [];

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    const fail = (p: RecognitionProblem) => {
      wantRef.current = false;
      setProblem(p);
    };

    rec.onstart = () => {
      activeRef.current = true;
      setListening(true);
    };

    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) onFinalRef.current(text);
        else interimText += text;
      }
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          fail("permission-denied");
          break;
        case "audio-capture":
          fail("no-microphone");
          break;
        case "network":
          fail("network");
          break;
        case "no-speech":
        case "aborted":
          break; // normal; handled by the restart logic in onend
        default:
          fail("unknown");
      }
    };

    rec.onend = () => {
      activeRef.current = false;
      setListening(false);
      setInterim("");
      waiters.current.splice(0).forEach((resolve) => resolve());

      if (!wantRef.current) return;
      // The browser stopped by itself (for example after silence): restart,
      // but give up if it keeps restarting rapidly.
      const now = Date.now();
      restartTimes.current = restartTimes.current.filter(
        (t) => now - t < 10000
      );
      if (restartTimes.current.length >= 5) {
        fail("unknown");
        return;
      }
      restartTimes.current.push(now);
      try {
        rec.start();
      } catch {
        fail("unknown");
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      fail("unknown");
    }
  }, [Ctor, lang]);

  const stop = useCallback(() => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      // Already stopped.
    }
  }, []);

  // Stops and waits for the final words to arrive (or gives up after 1.5 s).
  const stopAndWait = useCallback(
    () =>
      new Promise<void>((resolve) => {
        wantRef.current = false;
        const rec = recRef.current;
        if (!rec || !activeRef.current) {
          resolve();
          return;
        }
        waiters.current.push(resolve);
        try {
          rec.stop();
        } catch {
          resolve();
        }
        window.setTimeout(resolve, 1500);
      }),
    []
  );

  useEffect(
    () => () => {
      wantRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        // Nothing to abort.
      }
    },
    []
  );

  return { supported, listening, interim, problem, start, stop, stopAndWait };
}
