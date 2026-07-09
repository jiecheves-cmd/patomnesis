import React, { useEffect, useMemo, useState } from "react";
import { roleLabels } from "../data/questions.js";
import {
  createManagedUser,
  deleteManagedUser,
  fetchProfiles,
  updateProfileRole
} from "../lib/supabase.js";
import { describeSupabaseError } from "../lib/quizEngine.js";
import Metric from "./Metric.jsx";
import SupervisorUsers from "./SupervisorUsers.jsx";

function SupervisorDashboard({ answers, currentUser, questions }) {
  const [supervisorTab, setSupervisorTab] = useState("stats");
  const [profiles, setProfiles] = useState([]);
  const [profilesStatus, setProfilesStatus] = useState("Cargando usuarios...");
  const [roleUpdatingId, setRoleUpdatingId] = useState("");

  const topicRows = useMemo(() => {
    const grouped = new Map();
    answers.forEach((answer) => {
      const current = grouped.get(answer.category) || { correct: 0, wrong: 0 };
      if (answer.isCorrect) current.correct += 1;
      else current.wrong += 1;
      grouped.set(answer.category, current);
    });
    return Array.from(grouped.entries()).map(([category, value]) => {
      const total = value.correct + value.wrong;
      return { category, ...value, precision: total ? Math.round((value.correct / total) * 100) : 0 };
    });
  }, [answers]);

  const userRows = useMemo(() => {
    const grouped = new Map();

    answers.forEach((answer) => {
      const userId = answer.userId || currentUser.id;
      const current = grouped.get(userId) || {
        id: userId,
        initials: answer.userInitials || currentUser.initials,
        name: answer.userName || currentUser.name,
        role: answer.userRole || currentUser.role,
        correct: 0,
        wrong: 0,
        total: 0,
        lastWrongCategory: "Sin fallos",
        lastWrongQuestion: ""
      };

      current.total += 1;

      if (answer.isCorrect) {
        current.correct += 1;
      } else {
        current.wrong += 1;
        current.lastWrongCategory = answer.category;
        current.lastWrongQuestion = answer.questionStem || "";
      }

      grouped.set(userId, current);
    });

    if (!grouped.size) {
      grouped.set(currentUser.id, {
        id: currentUser.id,
        initials: currentUser.initials,
        name: currentUser.name,
        role: currentUser.role,
        correct: 0,
        wrong: 0,
        total: 0,
        lastWrongCategory: "Sin datos",
        lastWrongQuestion: ""
      });
    }

    return Array.from(grouped.values())
      .map((user) => ({
        ...user,
        precision: user.total ? Math.round((user.correct / user.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [answers, currentUser]);

  const activeUsers = userRows.filter((user) => user.total > 0).length;
  const averagePrecision = activeUsers
    ? Math.round(userRows.filter((user) => user.total > 0).reduce((sum, user) => sum + user.precision, 0) / activeUsers)
    : 0;
  const weakCategory = topicRows.length
    ? [...topicRows].sort((a, b) => a.precision - b.precision || b.wrong - a.wrong)[0].category
    : "Sin datos";

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      try {
        const nextProfiles = await fetchProfiles();
        if (cancelled) return;
        setProfiles(nextProfiles);
        setProfilesStatus(nextProfiles.length ? `${nextProfiles.length} usuarios registrados` : "Sin usuarios registrados");
      } catch (error) {
        if (cancelled) return;
        setProfilesStatus(`No se pudieron cargar usuarios: ${describeSupabaseError(error)}`);
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, []);

  async function changeUserRole(profileId, nextRole) {
    setRoleUpdatingId(profileId);
    setProfilesStatus("Actualizando rol...");

    try {
      const updatedProfile = await updateProfileRole({ profileId, role: nextRole });
      setProfiles((previous) =>
        previous.map((profile) => (profile.id === updatedProfile.id ? updatedProfile : profile))
      );
      setProfilesStatus("Rol actualizado.");
    } catch (error) {
      setProfilesStatus(`No se pudo actualizar el rol: ${describeSupabaseError(error)}`);
    } finally {
      setRoleUpdatingId("");
    }
  }

  async function createUser(userData) {
    setProfilesStatus("Creando usuario...");

    try {
      const createdProfile = await createManagedUser(userData);
      if (createdProfile) {
        setProfiles((previous) => [createdProfile, ...previous.filter((profile) => profile.id !== createdProfile.id)]);
      }
      setProfilesStatus("Usuario creado.");
    } catch (error) {
      setProfilesStatus(`No se pudo crear el usuario: ${describeSupabaseError(error)}`);
    }
  }

  async function deleteUser(profile) {
    if (profile.id === currentUser.id) return;
    const label = profile.full_name || profile.email;
    const confirmed = window.confirm(`¿Eliminar definitivamente a ${label}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    setRoleUpdatingId(profile.id);
    setProfilesStatus("Eliminando usuario...");

    try {
      await deleteManagedUser(profile.id);
      setProfiles((previous) => previous.filter((item) => item.id !== profile.id));
      setProfilesStatus("Usuario eliminado.");
    } catch (error) {
      setProfilesStatus(`No se pudo eliminar el usuario: ${describeSupabaseError(error)}`);
    } finally {
      setRoleUpdatingId("");
    }
  }

  return (
    <section className="supervisor-dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Modo supervisor</p>
          <h2>{supervisorTab === "stats" ? "Estadísticas de usuarios" : "Gestión de usuarios"}</h2>
        </div>
      </div>

      <nav className="supervisor-tabs" aria-label="Secciones de supervisor">
        <button
          className={supervisorTab === "stats" ? "active" : ""}
          onClick={() => setSupervisorTab("stats")}
          type="button"
        >
          Estadísticas
        </button>
        <button
          className={supervisorTab === "users" ? "active" : ""}
          onClick={() => setSupervisorTab("users")}
          type="button"
        >
          Usuarios
        </button>
      </nav>

      {supervisorTab === "users" ? (
        <SupervisorUsers
          currentUser={currentUser}
          onCreateUser={createUser}
          onDeleteUser={deleteUser}
          onRoleChange={changeUserRole}
          profiles={profiles}
          roleUpdatingId={roleUpdatingId}
          status={profilesStatus}
        />
      ) : (
        <>
      <div className="stats-grid">
        <Metric label="Usuarios activos" value={activeUsers} />
        <Metric label="Respuestas registradas" value={answers.length} />
        <Metric label="Precisión media" value={`${averagePrecision}%`} />
        <Metric label="Tema a reforzar" value={weakCategory} />
      </div>

      <article className="panel user-stats-panel">
        <div className="section-heading">
          <h3>Rendimiento por usuario</h3>
          <span className="table-note">Demo local: se actualizará con cada respuesta registrada.</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Respuestas</th>
                <th>Aciertos</th>
                <th>Fallos</th>
                <th>Precisión</th>
                <th>Último tema fallado</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="user-cell">
                      <span className="avatar small">{user.initials}</span>
                      <b>{user.name}</b>
                    </span>
                  </td>
                  <td>{roleLabels[user.role] || user.role}</td>
                  <td>{user.total}</td>
                  <td>{user.correct}</td>
                  <td>{user.wrong}</td>
                  <td>
                    <span className={`precision-pill ${user.precision >= 80 ? "good" : user.precision >= 60 ? "mid" : "low"}`}>
                      {user.precision}%
                    </span>
                  </td>
                  <td title={user.lastWrongQuestion}>{user.lastWrongCategory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel user-stats-panel">
        <div className="section-heading">
          <h3>Rendimiento por tema</h3>
          <span className="table-note">{questions.length} preguntas en el banco</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tema</th>
                <th>Correctas</th>
                <th>Fallos</th>
                <th>Precisión</th>
              </tr>
            </thead>
            <tbody>
              {topicRows.length ? (
                topicRows.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td>{row.correct}</td>
                    <td>{row.wrong}</td>
                    <td>{row.precision}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">Todavía no hay respuestas registradas en esta demo local.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
        </>
      )}
    </section>
  );
}

export default SupervisorDashboard;
