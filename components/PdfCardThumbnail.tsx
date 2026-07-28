"use client";

/**
 * Renders the first page of a résumé PDF as a card thumbnail (top-of-page,
 * cropped to the preview area). Reuses the app's existing react-pdf + pdfjs
 * worker setup. Absolutely positioned to fill its (position:relative) parent;
 * returns null on any load/render failure so the parent's placeholder shows
 * through. Loaded via next/dynamic({ ssr: false }) — never server-rendered.
 */

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export default function PdfCardThumbnail({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (failed) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        // Transparent until the page paints, so the parent placeholder shows
        // during load instead of a white flash.
        background: rendered ? "#fff" : "transparent",
      }}
    >
      {width > 0 && (
        <Document
          file={url}
          loading={null}
          error={null}
          onLoadError={() => setFailed(true)}
          onSourceError={() => setFailed(true)}
        >
          <Page
            pageNumber={1}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={null}
            onRenderSuccess={() => setRendered(true)}
            onRenderError={() => setFailed(true)}
          />
        </Document>
      )}
    </div>
  );
}
