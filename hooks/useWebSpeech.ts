import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWebSpeechOptions {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onStart: () => void;
    onEnd: () => void;
}

// Check for vendor-prefixed versions of the API
// FIX: Use `(window as any)` to safely access SpeechRecognition and webkitSpeechRecognition,
// which may not be present in the default TypeScript `Window` type.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useWebSpeech = ({ onResult, onError, onStart, onEnd }: UseWebSpeechOptions) => {
    const [isListening, setIsListening] = useState(false);
    // FIX: The `SpeechRecognition` constant is a value (the constructor), not a type.
    // Use `any` as the type for the ref since the specific type is not available.
    const recognitionRef = useRef<any | null>(null);
    // Ref to control automatic restarting. If true, onend will try to restart.
    // If false (e.g., user clicked stop or an error occurred), it will not.
    const shouldRestart = useRef(false);

    useEffect(() => {
        if (!SpeechRecognition) {
            console.warn("Web Speech API is not supported by this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening even after a pause
        recognition.interimResults = true; // Get results as the user speaks

        recognition.onstart = () => {
            setIsListening(true);
            onStart();
        };

        recognition.onend = () => {
            // Only restart if the stop was not intentional (i.e., shouldRestart is true)
            if (shouldRestart.current) {
                try {
                    recognition.start(); // Attempt to restart immediately
                } catch (e) {
                    // If restart fails, then truly end the session.
                    setIsListening(false);
                    onEnd();
                }
            } else {
                setIsListening(false);
                onEnd();
            }
        };

        recognition.onerror = (event: any) => {
            shouldRestart.current = false; // Do not restart on error.
            // 'no-speech' is a common event when the user pauses, we can ignore it to prevent spam.
            // The onend event will fire and handle restarting if needed.
            // 'aborted' happens on user stop, which is also normal.
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                onError(event.error);
            }
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            if (finalTranscript) {
                onResult(finalTranscript, true);
            } else if (interimTranscript) {
                onResult(interimTranscript, false);
            }
        };

        recognitionRef.current = recognition;
        
        // Cleanup function
        return () => {
            shouldRestart.current = false;
            recognition.stop();
        };

    }, [onResult, onError, onStart, onEnd]);

    const startRecognition = useCallback((lang: string) => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.lang = lang;
                shouldRestart.current = true; // Set flag to allow auto-restart
                recognitionRef.current.start();
            } catch(e) {
                // This can happen if recognition is already starting
                console.error("Could not start speech recognition:", e);
                onError("Failed to start recognition.");
            }
        }
    }, [isListening, onError]);

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current && isListening) {
            shouldRestart.current = false; // User-initiated stop, so prevent restarting
            recognitionRef.current.stop();
        }
    }, [isListening]);

    return { isListening, startRecognition, stopRecognition };
};