import React, { useEffect, useMemo, useState } from "react";
import { resolveQuestionImageUrls } from "../lib/questionImage.js";

function GalleryImage({ alt, className, onOpen, onError, src }) {
  return (
    <button aria-label="Ver imagen más grande" className="question-image-trigger" onClick={onOpen} type="button">
      <img
        alt={alt}
        className={className}
        decoding="async"
        onError={onError}
        referrerPolicy="no-referrer"
        src={src}
      />
    </button>
  );
}

function QuestionImage({ className = "question-image", preview = false, value }) {
  const imageUrls = useMemo(() => resolveQuestionImageUrls(value), [value]);
  const [failedUrls, setFailedUrls] = useState(() => new Set());
  const [zoomedIndex, setZoomedIndex] = useState(null);
  const imageUrlsKey = imageUrls.join("|");

  useEffect(() => {
    setFailedUrls(new Set());
    setZoomedIndex(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrlsKey]);

  useEffect(() => {
    if (zoomedIndex === null) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setZoomedIndex(null);
      if (event.key === "ArrowRight") setZoomedIndex((index) => Math.min(imageUrls.length - 1, index + 1));
      if (event.key === "ArrowLeft") setZoomedIndex((index) => Math.max(0, index - 1));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedIndex, imageUrls.length]);

  if (!imageUrls.length) return null;

  const visibleUrls = imageUrls.filter((url) => !failedUrls.has(url));

  if (!visibleUrls.length) {
    return (
      <div className={`question-image-error${preview ? " preview" : ""}`} role="alert">
        <span>No se pudo cargar {imageUrls.length > 1 ? "ninguna imagen" : "la imagen"}.</span>
        {imageUrls.length === 1 && /^https?:/i.test(imageUrls[0]) && (
          <a href={imageUrls[0]} rel="noreferrer" target="_blank">
            Abrir enlace
          </a>
        )}
      </div>
    );
  }

  function markFailed(url) {
    setFailedUrls((current) => new Set(current).add(url));
  }

  return (
    <>
      <div className={`question-image-gallery${visibleUrls.length > 1 ? " multi" : ""}`}>
        {visibleUrls.map((url) => (
          <GalleryImage
            alt={preview ? "Vista previa de la imagen" : "Imagen de la pregunta"}
            className={className}
            key={url}
            onError={() => markFailed(url)}
            onOpen={() => setZoomedIndex(visibleUrls.indexOf(url))}
            src={url}
          />
        ))}
      </div>
      {zoomedIndex !== null && (
        <div
          className="question-image-lightbox"
          onClick={() => setZoomedIndex(null)}
          role="button"
          tabIndex={-1}
        >
          <button
            aria-label="Cerrar"
            className="question-image-lightbox-close"
            onClick={() => setZoomedIndex(null)}
            type="button"
          >
            ✕
          </button>
          {visibleUrls.length > 1 && (
            <>
              <button
                aria-label="Imagen anterior"
                className="question-image-lightbox-nav prev"
                disabled={zoomedIndex === 0}
                onClick={(event) => {
                  event.stopPropagation();
                  setZoomedIndex((index) => Math.max(0, index - 1));
                }}
                type="button"
              >
                ‹
              </button>
              <button
                aria-label="Imagen siguiente"
                className="question-image-lightbox-nav next"
                disabled={zoomedIndex === visibleUrls.length - 1}
                onClick={(event) => {
                  event.stopPropagation();
                  setZoomedIndex((index) => Math.min(visibleUrls.length - 1, index + 1));
                }}
                type="button"
              >
                ›
              </button>
            </>
          )}
          <img
            alt={preview ? "Vista previa de la imagen ampliada" : "Imagen de la pregunta ampliada"}
            className="question-image-lightbox-img"
            onClick={(event) => event.stopPropagation()}
            referrerPolicy="no-referrer"
            src={visibleUrls[zoomedIndex]}
          />
          {visibleUrls.length > 1 && (
            <span className="question-image-lightbox-counter">
              {zoomedIndex + 1} / {visibleUrls.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}

export default QuestionImage;
