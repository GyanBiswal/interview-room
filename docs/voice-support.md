# Voice features and browser support

The interview room uses two browser features. No audio is stored by this app.

## Reading questions aloud (speech synthesis)

- Built into most browsers and works offline in many cases.
- Voice quality depends on the voices installed on your device.

## Speaking answers (speech recognition)

- Works in Chrome and Edge (as far as known). Chrome sends the audio to an
  online service, so it needs an internet connection and is not private.
- Safari support is partial and can be unreliable. Firefox has no support.
- Some privacy-focused browsers disable it.
- Always allow the microphone when the browser asks. If you blocked it, click
  the lock icon in the address bar and allow it.
- When it is unavailable the app falls back to typing.

## How answers are handled

- A pause in speech never submits an answer. If the browser stops listening, the app
  restarts it. Only "Finish answer" submits.
- Speech becomes editable text. Check it for recognition mistakes before submitting.

## Deployment notes

- The microphone needs HTTPS on deployed sites (localhost is exempt).
- Interview data lives only in this browser (later phases).
