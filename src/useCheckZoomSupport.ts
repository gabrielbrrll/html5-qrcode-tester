import { useEffect, useState } from "react";

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  zoom?: {
    max: number;
    min: number;
    step: number;
    default: number;
  };
}

export const useCheckZoomSupport = () => {
  const [isZoomSupported, setIsZoomSupported] = useState(false);
  const [zoomSupport, setZoomSupport] = useState<
    ExtendedMediaTrackCapabilities["zoom"] | undefined
  >();

  useEffect(() => {
    async function checkZoomSupport() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const capabilities =
        track.getCapabilities() as ExtendedMediaTrackCapabilities;

      const defaultZoom =
        capabilities?.zoom?.max && capabilities?.zoom?.max > 3.5
          ? 3.5
          : capabilities?.zoom?.max || 1.0;

      if ("zoom" in capabilities) {
        setIsZoomSupported(true);
        setZoomSupport({
          max: capabilities?.zoom?.max ?? 8.0,
          step: capabilities?.zoom?.step ?? 0.1,
          min: capabilities?.zoom?.min ?? 1.0,
          default: defaultZoom ?? 1.0,
        });
      }
    }

    void checkZoomSupport();
  }, []);

  return {
    isZoomSupported,
    zoomSupport,
  };
};

export default useCheckZoomSupport;
