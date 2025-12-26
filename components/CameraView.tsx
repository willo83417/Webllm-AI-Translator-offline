

import React, { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Webcam from 'react-webcam';
import { XIcon, FlashOnIcon, FlashOffIcon, GalleryIcon } from './icons';

interface CameraViewProps {
    onClose: () => void;
    onImageCaptured: (imageDataUrl: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onClose, onImageCaptured }) => {
    const { t } = useTranslation();
    const webcamRef = useRef<Webcam>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [zoomSupported, setZoomSupported] = useState(false);
    const [minZoom, setMinZoom] = useState(1);
    const [maxZoom, setMaxZoom] = useState(1);
    const [stepZoom, setStepZoom] = useState(0.1);

    const handleUserMedia = useCallback((stream: MediaStream) => {
        const track = stream.getVideoTracks()[0];
        if (!track) return;

        // Use a timeout to allow the track to stabilize before getting capabilities
        setTimeout(() => {
            try {
                const capabilities = track.getCapabilities() as any;

                if (capabilities.torch) {
                    setTorchSupported(true);
                }
                if (capabilities.zoom) {
                    setZoomSupported(true);
                    setMinZoom(capabilities.zoom.min || 1);
                    setMaxZoom(capabilities.zoom.max || 1);
                    setStepZoom(capabilities.zoom.step || 0.1);
                    // FIX: Property 'zoom' does not exist on type 'MediaTrackSettings'. Cast to any to access this non-standard property.
                    setZoom((track.getSettings() as any).zoom || 1);
                }
            } catch (err) {
                console.error("Error getting camera capabilities:", err);
            }
        }, 500);
    }, []);
    
    const handleCapture = useCallback(() => {
        if (!webcamRef.current || isCapturing) return;

        setIsCapturing(true);
        setError(null);
        
        try {
            const imageDataUrl = webcamRef.current.getScreenshot();
            if (imageDataUrl) {
                onImageCaptured(imageDataUrl);
            } else {
                throw new Error("Could not capture an image from the camera.");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(t('camera.errorCapture', { message }));
            setIsCapturing(false);
        }
    }, [isCapturing, onImageCaptured, t]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isCapturing) return;

        setIsCapturing(true);
        setError(null);

        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageDataUrl = e.target?.result as string;
                if (imageDataUrl) {
                    onImageCaptured(imageDataUrl);
                } else {
                    throw new Error("Could not read the selected file.");
                }
            };
            reader.onerror = () => {
                throw new Error("Error reading the file.");
            };
            reader.readAsDataURL(file);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(t('camera.errorLoad', { message }));
            setIsCapturing(false);
        }
    };

    const handleGalleryClick = () => {
        fileInputRef.current?.click();
    };

    const getTrack = (): MediaStreamTrack | null => {
        if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.srcObject) {
            const stream = webcamRef.current.video.srcObject as MediaStream;
            return stream.getVideoTracks()[0] || null;
        }
        return null;
    };

    const handleToggleTorch = async () => {
        const track = getTrack();
        if (!track || !torchSupported) return;
        try {
            // FIX: Property 'torch' does not exist on type 'MediaTrackConstraintSet'. Cast to any to set this non-standard property.
            await track.applyConstraints({
                advanced: [{ torch: !torchOn } as any]
            });
            setTorchOn(!torchOn);
        } catch (err) {
            console.error('Failed to toggle torch:', err);
        }
    };
    
    const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const track = getTrack();
        if (!track || !zoomSupported) return;
        const newZoom = parseFloat(e.target.value);
        setZoom(newZoom);
        try {
            // FIX: Property 'zoom' does not exist on type 'MediaTrackConstraintSet'. Cast to any to set this non-standard property.
            await track.applyConstraints({
                advanced: [{ zoom: newZoom } as any]
            });
        } catch (err) {
             console.error('Failed to apply zoom:', err);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="camera-view-title">
            <div className="relative w-full h-full flex items-center justify-center">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.9}
                    videoConstraints={{ facingMode: 'environment' }}
                    onUserMedia={handleUserMedia}
                    onUserMediaError={() => setError(t('camera.errorAccess'))}
                    className="w-full h-full object-cover"
                />
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                <div className="absolute inset-0 flex flex-col justify-between items-center p-4">
                    <div className="w-full flex justify-end">
                         <h2 id="camera-view-title" className="sr-only">{t('camera.title')}</h2>
                        <button onClick={onClose} className="text-white bg-black bg-opacity-50 rounded-full p-2" aria-label={t('camera.closeAriaLabel')}>
                            <XIcon className="w-8 h-8"/>
                        </button>
                    </div>

                    {error && 
                        <div className="bg-red-500 text-white p-3 rounded-md text-center transition-opacity" role="alert">
                            {error}
                        </div>
                    }

                    <div className="w-full flex flex-col items-center pb-6 space-y-4">
                         {zoomSupported && maxZoom > minZoom && (
                            <div className="w-full max-w-xs flex items-center justify-center bg-black/30 p-2 rounded-full">
                                <input
                                    type="range"
                                    min={minZoom}
                                    max={maxZoom}
                                    step={stepZoom}
                                    value={zoom}
                                    onChange={handleZoomChange}
                                    className="w-full h-2 bg-white/50 rounded-lg appearance-none cursor-pointer"
                                    aria-label={t('camera.zoomAriaLabel')}
                                />
                            </div>
                        )}
                        <div className="w-full flex justify-around items-center">
                            <button onClick={handleGalleryClick} className="text-white" aria-label={t('camera.galleryAriaLabel')}>
                                <GalleryIcon className="w-10 h-10" />
                            </button>

                            <button 
                                onClick={handleCapture} 
                                disabled={isCapturing}
                                className="w-20 h-20 bg-white/30 rounded-full flex items-center justify-center transition-all hover:bg-white/50 disabled:opacity-50 ring-4 ring-white/50 focus:ring-white"
                                aria-label={t('camera.captureAriaLabel')}
                            >
                                {isCapturing ? (
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" role="status" aria-label={t('camera.processingAriaLabel')}></div>
                                ) : (
                                    <div className="w-16 h-16 bg-white rounded-full shadow-lg"></div>
                                )}
                            </button>

                             {torchSupported ? (
                                <button onClick={handleToggleTorch} className="text-white" aria-label={torchOn ? t('camera.flashOnAriaLabel') : t('camera.flashOffAriaLabel')}>
                                    {torchOn ? <FlashOnIcon className="w-10 h-10" /> : <FlashOffIcon className="w-10 h-10" />}
                                </button>
                             ) : (
                                <div className="w-10 h-10"></div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CameraView;