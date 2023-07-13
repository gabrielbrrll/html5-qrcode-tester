import {
  CameraDevice,
  Html5Qrcode,
  Html5QrcodeCameraScanConfig,
  Html5QrcodeScannerState,
} from "html5-qrcode";
import { Html5QrcodeConfigs } from "html5-qrcode/esm/html5-qrcode";
import { useCallback, useEffect, useState } from "react";

import "./App.css";
import { useAudio, useIdle } from "react-use";
import { ScannerSoundEffects } from "./base64";
import useCheckZoomSupport from "./useCheckZoomSupport";
import { usePageVisibility } from "./usePageVisibility";

interface ScannerConfigs
  extends Html5QrcodeCameraScanConfig,
  Html5QrcodeConfigs {
  rememberLastUsedCamera: boolean;
  focusMode: string;
  defaultZoomValueIfSupported: number;
}

export const defaultHtml5QrCodeConfigs: ScannerConfigs = {
  fps: 10,
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

const isIos = () => {
  const userAgent = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent);
};

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
  const [showTapScreen, setShowTapScreen] = useState(false);
  const [tapScreenTapCount, setTapScreenTapCount] = useState(0);

  const { isZoomSupported, zoomSupport } = useCheckZoomSupport();
  const idle = useIdle(60 * 1000 * 5);


  const isPageVisible = usePageVisibility();

  const [audio, _, controls] = useAudio({
    key: audioKey,
    src: ScannerSoundEffects.SUCCESS,
    autoPlay: false,
    controls: false,
  });

  const onHandleScanSuccess = (decodedText: string) => {
    controls.play();
  };

  // const handleDocumentClick = (event: MouseEvent) => {
  //   const decodedText = "example decoded text"; // replace with your actual decoded text
  //   onHandleScanSuccess(decodedText);
  // };

  const handleClick = () => {
    controls.play();
  };

  // useEffect(() => {
  //   document.addEventListener("click", handleDocumentClick);

  //   return () => {
  //     document.removeEventListener("click", handleDocumentClick);
  //   };
  // }, []);

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

            if (isZoomSupported) {
              await html5QrCode
                .getRunningTrackCameraCapabilities()
                .zoomFeature()
                .apply(3);
            }

            setIsLoading(false);
            setScanner(html5QrCode);
            setScannerState(Html5QrcodeScannerState.SCANNING);
            showOverlayOnFirstLoad(html5QrCode);
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

  const showOverlayOnFirstLoad = useCallback(
    (scanner: Html5Qrcode | null) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;

      if (isIos()) {
        timeout = setTimeout(() => {
          if (tapScreenTapCount === 0) {
            setShowTapScreen(true);
            scanner?.pause();
            setScannerState(Html5QrcodeScannerState.PAUSED);
          }
        }, 300);
      }

      return () => {
        if (timeout !== null) {
          clearTimeout(timeout);
        }
      };
    },
    [tapScreenTapCount]
  );
  const closeOverlay = useCallback(() => {
    if (scanner && scannerState === Html5QrcodeScannerState.PAUSED) {
      scanner.resume();
      setScannerState(Html5QrcodeScannerState.SCANNING);
    }

    setShowTapScreen(false);
    setTapScreenTapCount((count) => count + 1);
  }, [scanner, scannerState]);

  /**
     * FOR IOS only atm
     *
     * This is to bypass ios audio autoplay restrictions
     * We show a tap to scan screen before allowing
     * scanning procedures
     *
     * This will not close camera -> it should just
     * pause it disallowing any reading
     */
  const showOverlayWhenInactive = useCallback(() => {
    if (isIos()) {
      if (!isPageVisible && !showTapScreen) {
        if (scanner && scannerState === Html5QrcodeScannerState.SCANNING) {
          scanner.pause();
          setScannerState(Html5QrcodeScannerState.PAUSED);
        }
        setShowTapScreen(true);
      }
    }
  }, [
    isPageVisible,
    scanner,
    scannerState,
    showTapScreen,
  ]);

  /**
       * should call overlay function when
       * page is not visible
       *
       * @usePageVisibility
       */
  useEffect(() => {
    showOverlayWhenInactive();
  }, [showOverlayWhenInactive]);


    //show tap to screen overlay in ipad when idle for 5 minutes
    const showOverlayWhenIdle = useCallback(() => {
      if (isIos()) {
          if (idle && !showTapScreen) {
              if (scanner && scannerState === Html5QrcodeScannerState.SCANNING) {
                  scanner.pause();
                  setScannerState(Html5QrcodeScannerState.PAUSED);
              }
              setShowTapScreen(true);
          }
      }
  }, [idle, scanner, scannerState, showTapScreen]);

  useEffect(() => {
    if (idle) showOverlayWhenIdle();
}, [idle, showOverlayWhenIdle]);

  return (
    <div className="App">
      <h1>Scanner app proto</h1>
      {showTapScreen ? <div id="overlay" onClick={closeOverlay}>Tap to Scan</div> : null}
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
