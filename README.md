<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# WebLLM AI Translator

A modern, high-performance, privacy-focused translation application that runs entirely in your browser. This project leverages cutting-edge web technologies like WebAssembly, WebGPU, and Progressive Web Apps (PWA) to deliver a seamless experience with both online and offline capabilities.

It features multi-modal inputs including text, real-time voice (ASR), and camera/image (OCR), making it a versatile tool for all your translation needs.
  
## 📸 Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="https://github.com/willo83417/Webllm-AI-Translator-offline/blob/gh-pages/screenshots/P1.png" width="200" alt="Screenshot 1"/>
      </td>
      <td align="center">
        <img src="https://github.com/willo83417/Webllm-AI-Translator-offline/blob/gh-pages/screenshots/P2.png" width="200" alt="Screenshot 2"/>
      </td>
      <td align="center">
        <img src="https://github.com/willo83417/Webllm-AI-Translator-offline/blob/gh-pages/screenshots/P3.png" width="200" alt="Screenshot 3"/>
      </td>
      <td align="center">
        <img src="https://github.com/willo83417/Webllm-AI-Translator-offline/blob/gh-pages/screenshots/P4.png" width="200" alt="Screenshot 4"/>
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://github.com/willo83417/Webllm-AI-Translator-offline/blob/gh-pages/screenshots/P5.png" width="200" alt="Screenshot 5"/>
      </td>
      <td align="center">
        <img src="https://github.com/willo83417/Webllm-AI-Translator-offline/blob/gh-pages/screenshots/P6.png" width="200" alt="Screenshot 6"/>
      </td>
      <td align="center">
        <img src="https://github.com/willo83417/Webllm-AI-Translator-offline/blob/gh-pages/screenshots/P7.png" width="200" alt="Screenshot 7"/>
      </td>
      <td align="center">
        <img src="https://github.com/willo83417/Webllm-AI-Translator-offline/blob/gh-pages/screenshots/P8.png" width="200" alt="Screenshot 8"/>
      </td>
    </tr>
  </table>
</div>
  
## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install` or `yarn install`  
2. Run the app:  
   `npm run dev` or `yarn run dev`
3. Open Chrome or Edge and enter `chrome://flags/`, find `Insecure origins treated as secure` and enter the local server IP to bypass security check to use WebGPU.  
Example: http://192.168.31.92:3000,192.168.31.92:3000,http://localhost:3000

# Webllm-AI-Translator-offline

🚀[Live Demo](https://willo83417.github.io/Webllm-AI-Translator-offline/ "Webllm-AI-Translator-offline")  
  

## ✨ Key Features

*   **Hybrid Online/Offline Mode**: Seamlessly switch between powerful cloud APIs (Google Gemini, OpenAI-compatible) and a fully local, privacy-preserving offline mode.
*   **Multi-Modal Input**:
    *   **Text**: Standard text input for quick translations.
    *   **Voice (ASR)**: Three modes for speech recognition:
        1.  Browser's native Web Speech API.
        2.  High-accuracy online provider APIs (Gemini/OpenAI).
        3.  A powerful, fully offline Whisper model for on-device transcription.
    *   **Camera (OCR)**: Extract and translate text from images using the high-performance local PaddleOCR v5 engine or fall back to online vision models.
*   **Advanced Speech Capabilities**:
    *   **Automatic Speech Translation (AST)**: Speak in one language and hear the spoken translation in another.
    *   **Offline ASR**: High-quality, on-device speech recognition powered by `whisper-large-v3-turbo-ONNX`.
    *   **Audio Processing**: Client-side noise cancellation and microphone gain control for clearer audio input.
*   **High-Performance Offline Engine**:
    *   Powered by **`@mlc-ai/web-llm`**, running large language models (Qwen, Llama, Gemma) directly in the browser with WebGPU acceleration.
    *   Supports loading custom models from Hugging Face.
    *   Automatic idle-timeout unloads models from memory to conserve system resources.
*   **Customizable TTS**: Use standard system voices or configure specific offline voices for Text-to-Speech output.
*   **High-Accuracy Mode**: A special two-step translation process (e.g., JP → EN → ZH) for improved accuracy between certain language pairs.
*   **Progressive Web App (PWA)**: Installable on your device, works offline, and provides a native-app-like experience.
*   **Modern UI**: A clean, responsive, and intuitive interface built with React and Tailwind CSS.

## 🛠️ Technology Stack

This project integrates several modern web technologies to achieve its online/offline capabilities:

*   **Frontend**: [React](https://react.dev/) (with TypeScript) and [Tailwind CSS](https://tailwindcss.com/) for a modern, component-based, and responsive user interface.
*   **Offline LLM**: [**`@mlc-ai/web-llm`**](https://github.com/mlc-ai/web-llm) runs large language models entirely in the browser using WebAssembly and WebGPU, ensuring privacy and offline functionality.
*   **Offline ASR**: [**`@huggingface/transformers`**](https://huggingface.co/docs/transformers.js) (with ONNX Runtime Web) executes state-of-the-art Whisper models for high-quality, on-device speech-to-text conversion.
*   **Offline OCR**: [**`esearch-ocr`**](https://github.com/search-sc/esearch-ocr) provides a powerful, local OCR engine based on PaddleOCR v5 for extracting text from images directly in the browser.
*   **Online Services**:
    *   [**`@google/genai`**](https://www.npmjs.com/package/@google/genai): The official Google Gemini API client for online translation and multi-modal features.
    *   **Fetch API**: Used for interacting with OpenAI-compatible API endpoints.
*   **Internationalization**: [**`i18next`**](https://www.i18next.com/) allows for easy UI language switching between English and Traditional Chinese.
*   **PWA**: [**`vite-plugin-pwa`**](https://vite-pwa-org.netlify.app/) manages the service worker, caching strategies, and manifest file to make the application installable and offline-capable.

## 📁 File Structure

The project is organized to separate concerns, making it easier to maintain and scale.

```
.
├── public/
│   ├── images/       # PWA icons for different screen sizes
│   └── favicon.ico   # Application favicon
├── src/
│   ├── components/     # Reusable React components (Input, Output, Modals, etc.)
│   ├── constants.ts    # Centralized constants (language lists, model configs)
│   ├── hooks/          # Custom React hooks (useWebSpeech, usePaddleOcr)
│   ├── services/       # Business logic and API communication
│   │   ├── asrService.ts     # Offline ASR audio processing and cache management
│   │   ├── geminiService.ts  # Google Gemini API integration
│   │   ├── offlineService.ts # Communication layer for the WebLLM worker
│   │   ├── openaiService.ts  # OpenAI-compatible API integration
│   │   ├── webllm.worker.ts  # Web worker for the offline LLM engine
│   │   └── worker.ts         # Web worker for the offline ASR engine
│   ├── types.ts        # Global TypeScript type definitions
│   ├── App.tsx         # Main application component and state management
│   ├── i18n.ts         # Internationalization (i18next) setup
│   └── index.tsx       # Application entry point
├── index.html        # Main HTML file with import maps
├── package.json      # Project dependencies and scripts
├── tsconfig.json     # TypeScript compiler configuration
└── vite.config.ts    # Vite build configuration (including PWA setup)
```

## 🚀 Getting Started

No complex setup is required to use the application. Simply open the web page.

**For Online Mode:**
1.  Navigate to **Settings → Online**.
2.  Select your provider (Gemini or OpenAI).
3.  Enter your API Key.
4.  (For OpenAI) Enter the API URL if you are using a proxy or compatible service.

**For Full Offline Functionality:**
1.  **Translation**: Go to **Settings → Offline LLM**. Enable "Offline Translation" and download a desired LLM model.
2.  **Voice Input**: Go to **Settings → Offline Speech**. Enable "Offline Speech Recognition" and download an ASR model.
3.  **Camera Input**: Go to **Settings → PaddleOCR v5**. Select a model that matches the languages you want to recognize and click "Initialize OCR Engine".
  
## Notes⚠️
## GitHub Pages settings  
1. Modify package.json
   ```
   "homepage": "https://<your-github-username>.github.io/repository name", ← Add this
   "deploy": "gh-pages -d dist", ← Add this  
   ```
2. Modify vite.config.ts
   ```
   base: '/repository name/', // ← Add this
   plugins: [],
   ```
   ```
           icons: [
          {
            "src": "images/icon-192.png", ←Modify "images/icon-192.png" not "/images/icon-192.png"
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
          },
          {
            "src": "images/icon-512.png", ←Modify "images/icon-512.png" not "/images/icon-512.png"
            "sizes": "512x512",
            "type": "image/png"
          }
        ]
   ```
3. Install gh-pages  
   `npm install gh-pages --save-dev` or `yarn add gh-pages -D`  
4. Output static website files  
   `npm build` or `yarn build`
5. Run to GitHub Pages  
    `npm run deploy` or `yarn run deploy`
