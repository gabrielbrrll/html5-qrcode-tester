import {
  CameraDevice,
  Html5Qrcode,
  Html5QrcodeCameraScanConfig,
  Html5QrcodeScannerState,
} from "html5-qrcode";
import { Html5QrcodeConfigs } from "html5-qrcode/esm/html5-qrcode";
import { useCallback, useEffect, useState } from "react";

import "./App.css";
import { useAudio } from "react-use";
import { ScannerSoundEffects } from "./base64";

interface ScannerConfigs
  extends Html5QrcodeCameraScanConfig,
    Html5QrcodeConfigs {
  rememberLastUsedCamera: boolean;
  focusMode: string;
  defaultZoomValueIfSupported: number;
}

export const defaultHtml5QrCodeConfigs: ScannerConfigs = {
  fps: 200,
  rememberLastUsedCamera: true,
  disableFlip: false,
  focusMode: "continuous",
  defaultZoomValueIfSupported: 1,
  aspectRatio: 1,
  qrbox: {
    height: 350,
    width: 350,
  },
  useBarCodeDetectorIfSupported: true,
};

type CameraId = CameraDevice["id"];

const App = () => {
  const [scannerState, setScannerState] = useState(
    Html5QrcodeScannerState.NOT_STARTED
  );
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [audioKey, setAudioKey] = useState(0);

  const [audio, _, controls] = useAudio({
    key: audioKey,
    src: ScannerSoundEffects.SUCCESS,
    autoPlay: false,
    controls: false,
  });

  const onHandleScanSuccess = (decodedText: string) => {
    controls.play();
    alert(decodedText);
  };

  const handleDocumentClick = (event: MouseEvent) => {
    const decodedText = "example decoded text"; // replace with your actual decoded text
    onHandleScanSuccess(decodedText);
  };

  const handleClick = () => {
    controls.play();
  };

  useEffect(() => {
    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    const fetchCameraDevices = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        console.log(devices, "++DEVICES");
        setCameras(devices);
      } catch (err) {
        console.warn("camera devices fetch failed", err);
      }
    };

    void fetchCameraDevices();
  }, []);

  const enableScanner = useCallback(
    async (deviceId?: CameraId) => {
      let cameraId: CameraId;

      try {
        /* istanbul ignore else */
        if (cameras && cameras.length > 0) {
          if (deviceId && cameras.some((camera) => camera.id === deviceId)) {
            cameraId = deviceId;
          } else {
            cameraId = cameras[0].id;
          }
          console.log("PASOk", cameras);
          console.log("deviceId", deviceId);
          console.log("cameraId", cameraId);

          const html5QrCode = new Html5Qrcode("qr-scanner");
          const configs = defaultHtml5QrCodeConfigs;

          const startScanner = async () => {
            await html5QrCode.start(
              cameraId,
              {
                ...configs,
              },
              (decodedText: string) => {
                onHandleScanSuccess(decodedText);
              },
              (err) => console.warn("no qr code parsed", err)
            );

            console.log(cameraId, "+ITO UNG CAMERA ID SA START SCANNER");
          };

          console.log(scannerState, "++SCANNER STATE");

          /* istanbul ignore else */
          if (
            scannerState === Html5QrcodeScannerState.NOT_STARTED ||
            scannerState === Html5QrcodeScannerState.SCANNING
          ) {
            await startScanner();
            setIsLoading(false);
            setScanner(html5QrCode);
            setScannerState(Html5QrcodeScannerState.SCANNING);
          }
        }
      } catch (err) {
        console.warn("scanner init failed", err);
      }
    },
    [onHandleScanSuccess, scannerState]
  );

  useEffect(() => {
    if (
      scannerState === Html5QrcodeScannerState.NOT_STARTED &&
      !activeCameraId
    ) {
      void enableScanner();
    }
  }, [enableScanner, scannerState]);

  const applyZoom = useCallback(
    async (zoomValue: number) => {
      await scanner
        ?.getRunningTrackCameraCapabilities()
        .zoomFeature()
        .apply(zoomValue);
    },
    [scanner]
  );

  useEffect(() => {
    const defaultZoom = 3.5;

    void applyZoom(defaultZoom);
  }, [applyZoom, scanner]);

  const stopCamera = async () => {
    if (scanner && scannerState === Html5QrcodeScannerState.SCANNING) {
      await scanner?.stop();
      scanner?.clear();
      setScanner(null);
      setScannerState(Html5QrcodeScannerState.NOT_STARTED);
    }
  };

  const handleCameraChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setIsLoading(true);
    const cameraId = event.target.value;

    setActiveCameraId(cameraId);

    await stopCamera();

    await enableScanner(cameraId);
  };

  return (
    <div className="App">
      <h1>Scanner app proto</h1>
      <div id="qr-scanner"></div>
      {audio}
      <select value={activeCameraId} onChange={handleCameraChange}>
        {cameras.map((camera) => (
          <option key={camera.id} value={camera.id}>
            {camera.label}
          </option>
        ))}
      </select>
      <button onClick={handleClick}>play audio</button>
      {/* <button onClick={stopCamera}>Stop camera</button> */}
      {isLoading && <div>Is loading</div>}
    </div>
  );
};

export default App;
