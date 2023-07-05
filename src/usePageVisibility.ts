import { useEffect, useState } from "react";

function getBrowserVisibilityProp(): string | undefined {
    if (typeof document.hidden !== "undefined") {
        // Opera 12.10 and Firefox 18 and later support
        return "visibilitychange";
    }
    return undefined
}

export function getIsDocumentVisible(): boolean {
    return !document["hidden"];
}

export function usePageVisibility(): boolean {
    const [isVisible, setIsVisible] = useState(getIsDocumentVisible());
    const onVisibilityChange = () => setIsVisible(getIsDocumentVisible());

    useEffect(() => {
        const visibilityChange = getBrowserVisibilityProp();

        if (visibilityChange) {
            document.addEventListener(visibilityChange, onVisibilityChange, false);

            return () => {
                document.removeEventListener(visibilityChange, onVisibilityChange);
            };
        }
    }, []);

    return isVisible;
}
