import React, { useState } from "react";
import { roleLabels } from "../data/questions.js";
import { managedRoleOptions } from "../lib/quizEngine.js";

function SupervisorUsers({ currentUser, onCreateUser, onDeleteUser, onResetHistory, onRoleChange, profiles, roleUpdatingId, status }) {
  const [newUser, setNewUser] = useState({
    email: "",
    fullName: "",
    password: "",
    role: "student"
  });
  const [localError, setLocalError] = useState("");
  const profileRows = profiles.map((profile) => ({
    ...profile,
    displayName: profile.full_name || profile.email,
    initials: (profile.full_name || profile.email || "US").slice(0, 2).toUpperCase()
  }));

  function updateNewUser(field, value) {
    setNewUser((previous) => ({ ...previous, [field]: value }));
  }

  function submitNewUser(event) {
    event.preventDefault();
    setLocalError("");

    if (!newUser.email.trim() || !newUser.password) {
      setLocalError("Email y contraseña inicial son obligatorios.");
      return;
    }

    if (newUser.password.length < 6) {
      setLocalError("La contraseña inicial debe tener al menos 6 caracteres.");
      return;
    }

    onCreateUser({
      email: newUser.email.trim(),
      fullName: newUser.fullName.trim(),
      password: newUser.password,
      role: newUser.role
    });

    setNewUser({ email: "", fullName: "", password: "", role: "student" });
  }

  return (
    <section className="supervisor-users">
      <article className="panel user-create-panel">
        <div className="section-heading">
          <div>
            <h3>Agregar usuario</h3>
            <span className="table-note">Crea una cuenta con contraseña inicial y rol asignado.</span>
          </div>
        </div>

        <form className="user-create-form" onSubmit={submitNewUser}>
          <label>
            Nombre
            <input
              onChange={(event) => updateNewUser("fullName", event.target.value)}
              placeholder="Nombre visible"
              value={newUser.fullName}
            />
          </label>
          <label>
            Email
            <input
              onChange={(event) => updateNewUser("email", event.target.value)}
              placeholder="usuario@ejemplo.com"
              required
              type="email"
              value={newUser.email}
            />
          </label>
          <label>
            Contraseña inicial
            <input
              onChange={(event) => updateNewUser("password", event.target.value)}
              required
              type="password"
              value={newUser.password}
            />
          </label>
          <label>
            Rol
            <select onChange={(event) => updateNewUser("role", event.target.value)} value={newUser.role}>
              {managedRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          {localError && <p className="auth-error wide">{localError}</p>}
          <button type="submit">Crear usuario</button>
        </form>
      </article>

      <article className="panel user-admin-panel">
        <div className="section-heading">
          <div>
            <h3>Usuarios registrados</h3>
            <span className="table-note">{status}</span>
          </div>
        </div>

        <div className="user-admin-note">
          <strong>Nota técnica</strong>
          <p>
            Crear y eliminar usuarios requiere la Edge Function <b>admin-users</b> desplegada en Supabase.
            Si falla, revisa que la función esté publicada y que exista la secret <b>SUPABASE_SERVICE_ROLE_KEY</b>.
          </p>
        </div>

        <div className="table-scroll">
          <table className="user-admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Alta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profileRows.length ? (
                profileRows.map((profile) => {
                  const isCurrentUser = profile.id === currentUser.id;

                  return (
                    <tr key={profile.id}>
                      <td>
                        <span className="user-cell">
                          <span className="avatar small">{profile.initials}</span>
                          <b>{profile.displayName}</b>
                        </span>
                      </td>
                      <td>{profile.email}</td>
                      <td>
                        <select
                          aria-label={`Rol de ${profile.displayName}`}
                          disabled={isCurrentUser || roleUpdatingId === profile.id}
                          onChange={(event) => onRoleChange(profile.id, event.target.value)}
                          value={profile.role}
                        >
                          {managedRoleOptions.map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>
                        {isCurrentUser && <span className="self-user-note">Tu cuenta</span>}
                      </td>
                      <td>{profile.created_at ? new Date(profile.created_at).toLocaleDateString("es-ES") : "-"}</td>
                      <td>
                        <span className="user-row-actions">
                          <button
                            className="secondary compact"
                            disabled={roleUpdatingId === profile.id}
                            onClick={() => onResetHistory(profile)}
                            type="button"
                          >
                            Reiniciar historial
                          </button>
                          <button
                            className="danger compact"
                            disabled={isCurrentUser || roleUpdatingId === profile.id}
                            onClick={() => onDeleteUser(profile)}
                            type="button"
                          >
                            Eliminar
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5">Todavía no hay perfiles cargados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default SupervisorUsers;
