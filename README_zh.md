<div align="center">
<img width="1200" height="300" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# WebLLM AI 翻譯工具

一個現代化、高效能、注重隱私的翻譯應用程式，完全在您的瀏覽器中運行。本專案利用 WebAssembly、WebGPU 和漸進式網頁應用（PWA）等尖端網頁技術，提供兼具線上和離線功能的無縫體驗。

它支援多模態輸入，包括文字、即時語音（ASR）和相機/圖片（OCR），使其成為滿足您所有翻譯需求的多功能工具。
  
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
  
## 本地測試

**前提條件:**  Node.js


1. 安裝依賴項:
   `npm install` 或 `yarn install`  
2. 執行應用程式:  
   `npm run dev` 或 `yarn run dev`
3. 執行Chrome 或是 Edge 網址列輸入 `chrome://flags/`, 搜尋 `Insecure origins treated as secure` 輸入本地伺服器 IP 以繞過安全檢查並使用 WebGPU  
範例: http://192.168.31.92:3000,192.168.31.92:3000,http://localhost:3000  
 
# Webllm-AI-Translator-offline

🚀[Live Demo](https://willo83417.github.io/Webllm-AI-Translator-offline/ "Webllm-AI-Translator-offline")  
  


## ✨ 主要功能

*   **混合線上/離線模式**：在強大的雲端 API（Google Gemini、OpenAI 相容服務）和完全本機、保護隱私的離線模式之間無縫切換。
*   **多模態輸入**：
    *   **文字**：標準的文字輸入，用於快速翻譯。
    *   **語音 (ASR)**：三種語音辨識模式：
        1.  瀏覽器內建的 Web Speech API。
        2.  高精度的線上服務供應商 API (Gemini/OpenAI)。
        3.  功能強大的完全離線 Whisper 模型，用於裝置端轉錄。
    *   **相機 (OCR)**：使用高效能的本機 PaddleOCR v5 引擎從圖片中提取並翻譯文字，或備用為線上視覺模型。
*   **進階語音功能**：
    *   **即時語音翻譯 (AST)**：用一種語言說話，即可聽到另一種語言的語音翻譯。
    *   **離線 ASR**：由 `whisper-large-v3-turbo-ONNX` 提供支援的高品質裝置端語音辨識。
    *   **音訊處理**：客戶端的降噪和麥克風增益控制，以獲得更清晰的音訊輸入。
*   **高效能離線引擎**：
    *   由 **`@mlc-ai/web-llm`** 提供技術支援，透過 WebGPU 加速直接在瀏覽器中運行大型語言模型（如 Qwen、Llama、Gemma）。
    *   支援從 Hugging Face 載入自訂模型。
    *   閒置超時自動卸載模型以節省系統資源。
*   **可自訂的 TTS**：使用標準系統語音或設定特定的離線語音，用於文字轉語音輸出。
*   **高準確度模式**：針對特定語言配對（例如：日文 → 英文 → 中文）的特殊兩步驟翻譯流程，以提高準確性。
*   **漸進式網頁應用 (PWA)**：可安裝在您的裝置上，支援離線工作，提供類似原生應用的體驗。
*   **現代化 UI**：使用 React 和 Tailwind CSS 打造的簡潔、響應式且直觀的介面。

## 🛠️ 技術堆疊

本專案整合了多項現代網頁技術，以實現其線上/離線功能：

*   **前端**：[React](https://react.dev/) (使用 TypeScript) 和 [Tailwind CSS](https://tailwindcss.com/)，用於構建現代化、元件化且響應式的用戶介面。
*   **離線 LLM**：[**`@mlc-ai/web-llm`**](https://github.com/mlc-ai/web-llm) 使用 WebAssembly 和 WebGPU 完全在瀏覽器中運行大型語言模型，確保隱私和離線功能。
*   **離線 ASR**：[**`@huggingface/transformers`**](https://huggingface.co/docs/transformers.js) (搭配 ONNX Runtime Web) 執行最先進的 Whisper 模型，用於高品質的裝置端語音轉文字。
*   **離線 OCR**：[**`esearch-ocr`**](https://github.com/search-sc/esearch-ocr) 提供基於 PaddleOCR v5 的強大本機 OCR 引擎，可直接在瀏覽器中從圖片提取文字。
*   **線上服務**：
    *   [**`@google/genai`**](https://www.npmjs.com/package/@google/genai)：官方 Google Gemini API 客戶端，用於線上翻譯和多模態功能。
    *   **Fetch API**：用於與 OpenAI 相容的 API 端點進行互動。
*   **國際化**：[**`i18next`**](https://www.i18next.com/) 讓 UI 語言在英文和繁體中文之間輕鬆切換。
*   **PWA**：[**`vite-plugin-pwa`**](https://vite-pwa-org.netlify.app/) 管理 Service Worker、快取策略和 manifest 檔案，使應用程式可安裝並具備離線能力。

## 📁 文件結構

專案結構遵循關注點分離原則，使其更易於維護和擴展。

```
.
├── public/
│   ├── images/       # PWA 圖示
│   └── favicon.ico   # 應用程式圖示
├── src/
│   ├── components/     # 可重複使用的 React 元件 (輸入、輸出、模態框等)
│   ├── constants.ts    # 集中管理的常數 (語言列表、模型設定)
│   ├── hooks/          # 自訂 React 鉤子 (useWebSpeech, usePaddleOcr)
│   ├── services/       # 業務邏輯與 API 通訊
│   │   ├── asrService.ts     # 離線 ASR 音訊處理與快取管理
│   │   ├── geminiService.ts  # Google Gemini API 整合
│   │   ├── offlineService.ts # WebLLM Worker 的通訊層
│   │   ├── openaiService.ts  # OpenAI 相容 API 整合
│   │   ├── webllm.worker.ts  # 離線 LLM 引擎的 Web Worker
│   │   └── worker.ts         # 離線 ASR 引擎的 Web Worker
│   ├── types.ts        # 全域 TypeScript 類型定義
│   ├── App.tsx         # 主要應用程式元件與狀態管理
│   ├── i18n.ts         # 國際化 (i18next) 設定
│   └── index.tsx       # 應用程式進入點
├── index.html        # 主要 HTML 檔案
├── package.json      # 專案依賴與腳本
├── tsconfig.json     # TypeScript 編譯器設定
└── vite.config.ts    # Vite 建置設定 (包含 PWA)
```

## 🚀 開始使用

使用此應用程式無需複雜的設定，只需打開網頁即可。

**線上模式：**
1.  前往 **設定 → 線上**。
2.  選擇您的服務提供商（Gemini 或 OpenAI）。
3.  輸入您的 API 金鑰。
4.  （若為 OpenAI）如果您使用代理或相容服務，請輸入 API URL。

**完整離線功能：**
1.  **翻譯**：前往 **設定 → 離線 LLM**。啟用「啟用離線翻譯」並下載您想要的 LLM 模型。
2.  **語音輸入**：前往 **設定 → 離線語音**。啟用「啟用離線語音辨識」並下載一個 ASR 模型。
3.  **相機輸入**：前往 **設定 → PaddleOCR v5**。選擇一個符合您想辨識語言的模型，然後點擊「初始化 OCR 引擎」。
  
## 注意事項⚠️
## GitHub Pages 設定  
1. 修改 package.json
   ```
   "homepage": "https://<your-github-username>.github.io/repository name", ← 新增這行
   "deploy": "gh-pages -d dist", ← 新增這行  
   ```
2. 修改 vite.config.ts
   ```
   base: '/repository name/', // ← 新增這行
   plugins: [],
   ```
   ```
           icons: [
          {
            "src": "images/icon-192.png", ←修改成 "images/icon-192.png" 而非 "/images/icon-192.png"
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
          },
          {
            "src": "images/icon-512.png", ←修改成 "images/icon-512.png" 而非 "/images/icon-512.png"
            "sizes": "512x512",
            "type": "image/png"
          }
        ]
   ```
3. 安裝 gh-pages  
   `npm install gh-pages --save-dev` 或 `yarn add gh-pages -D`  
4. 輸出靜態網站檔案  
   `npm build` 或 `yarn build`
5. 推送到 GitHub Pages  
    `npm run deploy` 或 `yarn run deploy`
