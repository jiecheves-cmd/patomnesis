import React, { useState } from "react";
import { roleLabels } from "../data/questions.js";

function ProfileDialog({ currentUser, message, onClose, onSave, profile }) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  function submitProfile(event) {
    event.preventDefault();
    setLocalError("");

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setLocalError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setLocalError("Las contraseñas no coinciden.");
        return;
      }
    }

    onSave({
      fullName: fullName.trim(),
      newPassword
    });
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="profile-overlay" role="presentation">
      <section className="profile-dialog" aria-modal="true" role="dialog" aria-labelledby="profile-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mi perfil</p>
            <h2 id="profile-title">Cuenta de Patomnesis</h2>
          </div>
          <button className="ghost compact" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>

        <div className="profile-summary">
          <span className="avatar">{currentUser.initials}</span>
          <div>
            <strong>{currentUser.name}</strong>
            <span>{roleLabels[currentUser.role] || currentUser.role}</span>
          </div>
        </div>

        <form className="profile-form" onSubmit={submitProfile}>
          <label>
            Nombre de usuario
            <input
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nombre que verá el profesor o supervisor"
              value={fullName}
            />
          </label>
          <label>
            Email
            <input disabled value={profile?.email || ""} />
          </label>
          <div className="password-advice">
            <strong>Cambia tu contraseña inicial</strong>
            <p>
              Si un supervisor te ha dado una contraseña provisional, cámbiala aquí por una
              contraseña personal que solo conozcas tú.
            </p>
          </div>
          <div className="profile-password-block">
            <p>
              <b>Cambiar contraseña</b>
              <span>Déjalo vacío si no quieres cambiarla.</span>
            </p>
            <label>
              Nueva contraseña
              <input
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </label>
            <label>
              Repetir nueva contraseña
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </label>
          </div>
          {localError && <p className="auth-error">{localError}</p>}
          {message && <p className="profile-message">{message}</p>}
          <button type="submit">Guardar cambios</button>
        </form>
      </section>
    </div>
  );
}

export default ProfileDialog;
