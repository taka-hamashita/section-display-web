import { useEffect, useRef, useState } from 'react';

interface QrScannerProps {
  onDetected: (payload: string) => void;
  onMessage: (message: string) => void;
}

type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'unsupported' | 'error';

type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

export function QrScanner({ onDetected, onMessage }: QrScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [errorText, setErrorText] = useState('');
  const [lastRaw, setLastRaw] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);

  const stopCamera = (nextStatus: ScannerStatus | null = 'idle') => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }

    if (nextStatus) {
      setStatus(nextStatus);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera(null);
    };
  }, []);

  const detectFromSource = async (source: CanvasImageSource) => {
    const results = await detectorRef.current?.detect(source);
    if (results && results.length > 0) {
      const raw = results[0].rawValue.trim();
      if (raw) {
        setLastRaw(raw);
        onDetected(raw);
        onMessage('QRを読み取りました');
        stopCamera();
      }
    }
  };

  const startCamera = async () => {
    setErrorText('');

    const ctor = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!ctor) {
      setStatus('unsupported');
      setErrorText('このブラウザはBarcodeDetectorに未対応です');
      onMessage('QR読み取りは未対応です');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      setErrorText('カメラが利用できません');
      onMessage('カメラが利用できません');
      return;
    }

    setStatus('starting');

    try {
      detectorRef.current = new ctor({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' }
        }
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error('video要素が見つかりません');
      }

      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      await video.play();

      setStatus('scanning');
      onMessage('QR読み取り中');

      intervalRef.current = window.setInterval(() => {
        if (busyRef.current || !videoRef.current || !canvasRef.current || !detectorRef.current) {
          return;
        }

        const videoElement = videoRef.current;
        const canvas = canvasRef.current;
        if (!videoElement || videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          return;
        }

        const width = videoElement.videoWidth;
        const height = videoElement.videoHeight;
        if (!width || !height) {
          return;
        }

        busyRef.current = true;
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          busyRef.current = false;
          return;
        }

        context.drawImage(videoElement, 0, 0, width, height);

        void detectFromSource(canvas).finally(() => {
          busyRef.current = false;
        });
      }, 250);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'カメラ起動に失敗しました';
      setStatus('error');
      setErrorText(message);
      onMessage(message);
      stopCamera();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorText('');
    try {
      const ctor = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (!ctor) {
        setStatus('unsupported');
        setErrorText('このブラウザはBarcodeDetectorに未対応です');
        onMessage('画像からの読み取りは未対応です');
        return;
      }

      detectorRef.current = new ctor({ formats: ['qr_code'] });
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        void detectFromSource(image)
          .catch(() => {
            setStatus('error');
            setErrorText('画像からQRを読み取れませんでした');
          })
          .finally(() => {
            URL.revokeObjectURL(imageUrl);
          });
      };

      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        setStatus('error');
        setErrorText('画像を読み込めませんでした');
      };

      image.src = imageUrl;
    } finally {
      event.target.value = '';
    }
  };

  return (
    <section className="card card-scanner">
      <div className="card-header">
        <div>
          <p className="card-kicker">QR読み取り</p>
          <h2>カメラまたは画像から取り込む</h2>
        </div>
        <div className="scanner-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={status === 'scanning' ? () => stopCamera() : startCamera}
          >
            {status === 'scanning' ? '停止' : 'カメラ開始'}
          </button>
          <label className="file-button">
            画像を選ぶ
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
        </div>
      </div>

      <video ref={videoRef} className="scanner-video" muted playsInline autoPlay />
      <canvas ref={canvasRef} className="scanner-canvas" />

      <div className="scanner-status">
        <span className={`status-badge status-${status}`}>{status}</span>
        <p>{errorText || (status === 'scanning' ? 'QRをカメラに映してください' : '必要なときだけ読み取りを開始できます')}</p>
      </div>

      {lastRaw ? (
        <label className="payload-box">
          <span>最後に読んだ内容</span>
          <textarea readOnly rows={2} value={lastRaw} />
        </label>
      ) : null}
    </section>
  );
}
