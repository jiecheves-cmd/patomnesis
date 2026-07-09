import React, { useState } from "react";
import { describeSupabaseError } from "../lib/quizEngine.js";

function LoginScreen({ authError, authLoading, onLogin, onPasswordReset, status }) {
  const [email, setEmail] = useState("");
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  function submitLogin(event) {
    event.preventDefault();
    onLogin({ email: email.trim(), password });
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    setResetError("");
    setResetMessage("");

    try {
      await onPasswordReset(email.trim());
      setResetMessage("Te hemos enviado un enlace para recuperar la contraseña. Revisa tu correo.");
    } catch (error) {
      setResetError(describeSupabaseError(error));
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <img src="/brand/patomnesis-icon.png" alt="" />
          <div>
            <h1>Patomnesis</h1>
            <span>Acceso con perfil</span>
          </div>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">Usuarios reales</p>
          <h2>{isRecoveringPassword ? "Recuperar contraseña" : "Entra con tu cuenta"}</h2>
          {isRecoveringPassword ? (
            <p>Escribe tu email y te enviaremos un enlace para crear una contraseña nueva.</p>
          ) : (
            <p>
              Cada usuario accede con email y contraseña. El rol de alumno, profesor o supervisor
              se toma del perfil guardado en Supabase.
            </p>
          )}
        </div>

        <form className="auth-form" onSubmit={isRecoveringPassword ? submitPasswordReset : submitLogin}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              required
              type="email"
              value={email}
            />
          </label>
          {!isRecoveringPassword && (
            <label>
              Contraseña
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tu contraseña"
                required
                type="password"
                value={password}
              />
            </label>
          )}
          {authError && !isRecoveringPassword && <p className="auth-error">{authError}</p>}
          {resetError && <p className="auth-error">{resetError}</p>}
          {resetMessage && <p className="auth-success">{resetMessage}</p>}
          <button className="primary-large" disabled={authLoading} type="submit">
            {isRecoveringPassword ? "Enviar enlace" : authLoading ? "Entrando..." : "Entrar"}
          </button>
          <button
            className="text-link"
            onClick={() => {
              setIsRecoveringPassword((current) => !current);
              setResetError("");
              setResetMessage("");
            }}
            type="button"
          >
            {isRecoveringPassword ? "Volver al acceso" : "He olvidado mi contraseña"}
          </button>
        </form>

        {status?.startsWith("Supabase no disponible") && <p className="auth-note">{status}</p>}
      </section>
    </main>
  );
}

export default LoginScreen;
