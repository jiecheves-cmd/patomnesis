import assert from "node:assert/strict";
import test from "node:test";
import { resolveQuestionImageUrl } from "./questionImage.js";

test("normaliza enlaces compartidos de Google Drive", () => {
  assert.equal(
    resolveQuestionImageUrl("https://drive.google.com/file/d/abc123/view?usp=sharing"),
    "https://drive.google.com/uc?export=view&id=abc123"
  );
});

test("solicita el contenido directo de Dropbox", () => {
  assert.equal(
    resolveQuestionImageUrl("https://www.dropbox.com/scl/fi/demo/image.jpg?rlkey=key&dl=0"),
    "https://www.dropbox.com/scl/fi/demo/image.jpg?rlkey=key&raw=1"
  );
});

test("convierte una ruta de Storage en una URL publica", () => {
  assert.equal(
    resolveQuestionImageUrl("microscopia/caso 1.jpg", "https://demo.supabase.co"),
    "https://demo.supabase.co/storage/v1/object/public/question-images/microscopia/caso%201.jpg"
  );
});

test("conserva URLs directas y rutas locales", () => {
  assert.equal(resolveQuestionImageUrl(" https://images.example.org/sample.png "), "https://images.example.org/sample.png");
  assert.equal(resolveQuestionImageUrl("/brand/patomnesis-icon.png"), "/brand/patomnesis-icon.png");
});
