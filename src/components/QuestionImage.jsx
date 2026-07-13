import React, { useEffect, useMemo, useState } from "react";
import { resolveQuestionImageUrl } from "../lib/questionImage.js";

function QuestionImage({ className = "question-image", preview = false, value }) {
  const imageUrl = useMemo(() => resolveQuestionImageUrl(value), [value]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

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
    <img
      alt={preview ? "Vista previa de la imagen" : "Imagen de la pregunta"}
      className={className}
      decoding="async"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      src={imageUrl}
    />
  );
}

export default QuestionImage;
