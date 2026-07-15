import React, { useEffect, useMemo, useState } from "react";
import { resolveQuestionImageUrl } from "../lib/questionImage.js";

function QuestionImage({ className = "question-image", preview = false, value }) {
  const imageUrl = useMemo(() => resolveQuestionImageUrl(value), [value]);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setZoomed(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!zoomed) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setZoomed(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomed]);

  if (!imageUrl) return null;

  if (failed) {
    return (
      <div className={`question-image-error${preview ? " preview" : ""}`} role="alert">
        <span>No se pudo cargar la imagen.</span>
        {/^https?:/i.test(imageUrl) && (
          <a href={imageUrl} rel="noreferrer" target="_blank">
            Abrir enlace
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        aria-label="Ver imagen más grande"
        className="question-image-trigger"
        onClick={() => setZoomed(true)}
        type="button"
      >
        <img
          alt={preview ? "Vista previa de la imagen" : "Imagen de la pregunta"}
          className={className}
          decoding="async"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          src={imageUrl}
        />
      </button>
      {zoomed && (
        <div
          className="question-image-lightbox"
          onClick={() => setZoomed(false)}
          role="button"
          tabIndex={-1}
        >
          <button
            aria-label="Cerrar"
            className="question-image-lightbox-close"
            onClick={() => setZoomed(false)}
            type="button"
          >
            ✕
          </button>
          <img
            alt={preview ? "Vista previa de la imagen ampliada" : "Imagen de la pregunta ampliada"}
            className="question-image-lightbox-img"
            onClick={(event) => event.stopPropagation()}
            referrerPolicy="no-referrer"
            src={imageUrl}
          />
        </div>
      )}
    </>
  );
}

export default QuestionImage;
