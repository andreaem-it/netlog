"use client";
import { useEffect, useRef, useState } from "react";

// ponytail: native canvas crop, no library. A drag-to-pan + slider-to-zoom
// viewport is the whole feature — good enough for "pick what shows in the
// square/banner", not a full photo editor.
export function ImageCropper({
  file,
  aspect,
  outputWidth,
  outputHeight,
  onCancel,
  onConfirm,
}: {
  file: File;
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const viewportWidth = aspect >= 1 ? 320 : Math.round(320 * aspect);
  const viewportHeight = aspect >= 1 ? Math.round(320 / aspect) : 320;

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const fit = Math.max(
        viewportWidth / img.naturalWidth,
        viewportHeight / img.naturalHeight,
      );
      setImage(img);
      setMinScale(fit);
      setScale(fit);
      setPosition({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- file identity is enough
  }, [file]);

  function clamp(next: { x: number; y: number }, atScale: number) {
    if (!image) return next;
    const displayedWidth = image.naturalWidth * atScale;
    const displayedHeight = image.naturalHeight * atScale;
    const slackX = Math.max(0, (displayedWidth - viewportWidth) / 2);
    const slackY = Math.max(0, (displayedHeight - viewportHeight) / 2);
    return {
      x: Math.min(slackX, Math.max(-slackX, next.x)),
      y: Math.min(slackY, Math.max(-slackY, next.y)),
    };
  }

  function handlePointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, origin: position };
  }
  function handlePointerMove(event: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setPosition(
      clamp(
        { x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy },
        scale,
      ),
    );
  }
  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleZoom(nextScale: number) {
    setScale(nextScale);
    setPosition((current) => clamp(current, nextScale));
  }

  function confirm() {
    if (!image) return;
    const displayedWidth = image.naturalWidth * scale;
    const displayedHeight = image.naturalHeight * scale;
    const topLeftX = displayedWidth / 2 - viewportWidth / 2 - position.x;
    const topLeftY = displayedHeight / 2 - viewportHeight / 2 - position.y;
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      image,
      topLeftX / scale,
      topLeftY / scale,
      viewportWidth / scale,
      viewportHeight / scale,
      0,
      0,
      outputWidth,
      outputHeight,
    );
    canvas.toBlob((blob) => blob && onConfirm(blob), "image/jpeg", 0.9);
  }

  return (
    <div className="stack">
      <div
        className="cropper-viewport"
        style={{ width: viewportWidth, height: viewportHeight }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- dragged/scaled via transform, not a static display image.
          <img
            src={image.src}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: image.naturalWidth * scale,
              height: image.naturalHeight * scale,
              maxWidth: "none",
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              cursor: "grab",
            }}
          />
        )}
      </div>
      <label>
        Zoom
        <input
          type="range"
          min={minScale}
          max={minScale * 3}
          step={(minScale * 3 - minScale) / 100 || 0.01}
          value={scale}
          onChange={(event) => handleZoom(Number(event.target.value))}
        />
      </label>
      <div className="button-row">
        <button type="button" className="button" onClick={onCancel}>
          Annulla
        </button>
        <button type="button" className="button button-primary" onClick={confirm}>
          Usa questa foto
        </button>
      </div>
    </div>
  );
}
