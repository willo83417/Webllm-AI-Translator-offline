
import { useState, useCallback } from 'react';
import * as ocr from "esearch-ocr";
import * as ort from "onnxruntime-web";
import type { OcrEngineStatus, EsearchOCROutput, OcrModelConfig } from '../types';
import { getFromDB, setInDB } from '../utils/db';

export const usePaddleOcr = () => {
    const [ocrInstance, setOcrInstance] = useState<any>(null);
    const [status, setStatus] = useState<OcrEngineStatus>('uninitialized');
    const [error, setError] = useState<string | null>(null);

    const initializeOcr = useCallback(async (modelConfig: OcrModelConfig) => {
        setStatus('initializing');
        setError(null);
        try {
            // In browser environments using UMD bundles via importmap, 
            // the module might be wrapped. We extract the actual 'ort' object.
            const ortInstance: any = (ort as any).default || ort;
            
            // ONNX runtime is now configured globally via `window.ortConfig` in index.html
            // to prevent timing issues with SharedArrayBuffer checks.

            const DET_MODEL_KEY = 'det-model';
            const REC_MODEL_KEY = `rec-model-${modelConfig.key}`;
            const DICT_KEY = `dict-${modelConfig.key}`;

            let detBuffer = await getFromDB<ArrayBuffer>(DET_MODEL_KEY);
            let recBuffer = await getFromDB<ArrayBuffer>(REC_MODEL_KEY);
            let dictText = await getFromDB<string>(DICT_KEY);
            
            const fetchPromises: Promise<void>[] = [];

            if (!detBuffer) {
                fetchPromises.push(
                    fetch(modelConfig.detPath)
                        .then(res => res.arrayBuffer())
                        .then(async buffer => {
                            detBuffer = buffer;
                            await setInDB(DET_MODEL_KEY, buffer);
                        })
                );
            }
            if (!recBuffer) {
                fetchPromises.push(
                    fetch(modelConfig.recPath)
                        .then(res => res.arrayBuffer())
                        .then(async buffer => {
                            recBuffer = buffer;
                            await setInDB(REC_MODEL_KEY, buffer);
                        })
                );
            }
            if (!dictText) {
                fetchPromises.push(
                    fetch(modelConfig.dictPath)
                        .then(res => res.arrayBuffer())
                        .then(async buffer => {
                            const decoder = new TextDecoder('utf-8');
                            dictText = decoder.decode(buffer);
                            await setInDB(DICT_KEY, dictText);
                        })
                );
            }

            if (fetchPromises.length > 0) {
                 await Promise.all(fetchPromises);
            }
            
            if (!detBuffer || !recBuffer || !dictText) {
                throw new Error("Failed to load required assets.");
            }

            // Init esearch-ocr
            // IMPORTANT: Converting ArrayBuffer to Uint8Array is necessary for InferenceSession.create.
            const instance = await (ocr as any).init({
                det: {
                    input: new Uint8Array(detBuffer),
                },
                rec: {
                    input: new Uint8Array(recBuffer),
                    decodeDic: dictText,
					optimize: {
						space: false, // v3 v4识别时英文空格不理想，但v5得到了改善，默认为true，需要传入false来关闭
					}
                },
                ort: ortInstance,
            });

            setOcrInstance(instance);
            setStatus('ready');
        } catch (e: any)
{
            setError(`Initialization failed: ${e.message || 'Check models'}`);
            setStatus('error');
            console.error('OCR Engine initialization error:', e);
        }
    }, []);

    const recognize = useCallback(async (image: HTMLImageElement | HTMLCanvasElement): Promise<{ result: EsearchOCROutput, time: number } | null> => {
        if (status !== 'ready' || !ocrInstance) {
            return null;
        }

        try {
            const startTime = performance.now();
            const recognitionResult: EsearchOCROutput = await ocrInstance.ocr(image);
            const endTime = performance.now();

            return { result: recognitionResult, time: endTime - startTime };
        } catch (e: any) {
            console.error('Recognition error:', e);
            throw new Error(e.message || 'OCR processing failed.');
        }
    }, [ocrInstance, status]);

    return { status, error, recognize, initializeOcr };
};
