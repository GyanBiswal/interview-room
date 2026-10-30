import { useCallback, useEffect, useRef, useState } from "react";

function pickVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const preferred = ["en-in", "en-gb", "en-us"];
  for (const lang of preferred) {
    const match = voices.find(
      (v) => v.lang.replace("_", "-").toLowerCase() === lang
    );
    if (match) return match;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? null;
}

// Reads text aloud with the browser's built-in speech synthesis.
export function useSpeechSynthesis() {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const timerRef = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (!supported) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      cancel();
      // A short delay after cancel() avoids a Chrome quirk where the next
      // utterance is silently dropped.
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickVoice(window.speechSynthesis.getVoices());
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = "en-US";
        }
        utterance.rate = 0.95;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }, 80);
    },
    [supported, cancel]
  );

  // Stop talking when the component goes away.
  useEffect(() => cancel, [cancel]);

  return { supported, speaking, speak, cancel };
}
