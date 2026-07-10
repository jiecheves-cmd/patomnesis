import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = Boolean(supabase);

function isAnonymousUser(user) {
  return Boolean(
    user?.is_anonymous ||
      user?.app_metadata?.provider === "anonymous" ||
      user?.app_metadata?.providers?.includes("anonymous") ||
      !user?.email
  );
}

function mapQuestion(row) {
  const options = [...(row.question_options || [])]
    .sort((a, b) => a.position - b.position)
    .map((option) => ({
      id: option.id,
      text: option.option_text,
      isCorrect: option.is_correct
    }));

  return {
    id: row.id,
    category: row.category,
    topic: row.topic || "",
    difficulty: row.difficulty,
    stem: row.stem,
    imageUrl: row.image_path || "",
    options,
    explanation: row.explanation || "",
    keyPoint: row.key_point || ""
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapAnswerHistoryRow(row, profileMap = new Map()) {
  const question = row.questions;
  const attempt = row.quiz_attempts;
  const profile = profileMap.get(attempt?.student_id);

  return {
    questionId: question.id,
    questionStem: question.stem,
    category: question.category,
    difficulty: question.difficulty,
    selectedOptionId: row.selected_option_id,
    isCorrect: row.is_correct,
    userId: attempt?.student_id,
    userInitials: (profile?.full_name || profile?.email || "US").slice(0, 2).toUpperCase(),
    userName: profile?.full_name || profile?.email || "Usuario",
    userRole: profile?.role || "student",
    answeredAt: row.answered_at
  };
}

async function fetchQuestionById(questionId) {
  const { data, error } = await supabase
    .from("questions")
    .select("*, question_options(*)")
    .eq("id", questionId)
    .single();

  if (error) throw error;
  return mapQuestion(data);
}

export async function getCurrentProfileSession() {
  if (!supabase) return { profile: null, session: null, user: null };

  const { data: currentSession, error } = await supabase.auth.getSession();
  if (error) throw error;

  const session = currentSession.session;
  const user = session?.user;
  if (!user) return { profile: null, session, user: null };

  if (isAnonymousUser(user)) {
    await supabase.auth.signOut();
    return { profile: null, session: null, user: null };
  }

  const profile = await ensureProfile(user);
  return { profile, session, user };
}

export async function ensureProfile(user, role = "student") {
  if (!supabase || !user) return null;

  if (isAnonymousUser(user)) {
    throw new Error("Las sesiones anonimas no estan permitidas. Inicia sesion con email y contrasena.");
  }

  const email = user.email;
  const fullName = user.user_metadata?.full_name || null;

  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select()
    .eq("id", user.id)
    .maybeSingle();

  if (readError) throw readError;
  if (existingProfile) return existingProfile;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email,
      full_name: fullName,
      role: role === "student" ? role : "student"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function signInWithPassword({ email, password }) {
  if (!supabase) return { profile: null, session: null, user: null };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  const user = data.user;
  const profile = await ensureProfile(user);
  return { profile, session: data.session, user };
}

export async function fetchOwnAnswerHistory() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("quiz_answers")
    .select(
      `
        id,
        answered_at,
        is_correct,
        selected_option_id,
        questions (
          id,
          stem,
          category,
          difficulty
        ),
        quiz_attempts (
          student_id
        )
      `
    )
    .order("answered_at", { ascending: true });

  if (error) throw error;

  return (data || [])
    .filter((row) => row.questions)
    .map((row) => mapAnswerHistoryRow(row));
}

export async function fetchAllAnswerHistory() {
  if (!supabase) return [];

  const [{ data: answers, error: answersError }, profiles] = await Promise.all([
    supabase
      .from("quiz_answers")
      .select(
        `
          id,
          answered_at,
          is_correct,
          selected_option_id,
          questions (
            id,
            stem,
            category,
            difficulty
          ),
          quiz_attempts (
            student_id
          )
        `
      )
      .order("answered_at", { ascending: true }),
    fetchProfiles()
  ]);

  if (answersError) throw answersError;

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  return (answers || [])
    .filter((row) => row.questions)
    .map((row) => mapAnswerHistoryRow(row, profileMap));
}

export async function fetchGlobalLeaderboard() {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_global_leaderboard");
  if (error) throw error;
  return data || [];
}

export async function signOutUser() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordResetEmail(email) {
  if (!supabase || !email) return;

  const redirectTo = `${window.location.origin}/?password_recovery=1`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (error) throw error;
}

export async function updateOwnProfile({ fullName, userId }) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      "No se pudo actualizar el perfil. Ejecuta de nuevo supabase/schema.sql en Supabase SQL Editor."
    );
  }

  return data;
}

export async function updateOwnPassword(password) {
  if (!supabase || !password) return;

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function updateOwnUserMetadata({ fullName }) {
  if (!supabase) return;

  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName || null }
  });
  if (error) throw error;
}

export async function fetchProfiles() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateProfileRole({ profileId, role }) {
  if (!supabase || !profileId || !role) return null;

  const { data, error } = await supabase.rpc("set_profile_role", {
    next_role: role,
    target_profile_id: profileId
  });

  if (error) throw error;
  return data;
}

export async function createManagedUser({ email, fullName, password, role }) {
  if (!supabase) return null;

  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: {
      action: "create",
      email,
      fullName,
      password,
      role
    }
  });

  if (error) throw error;
  return data?.profile || null;
}

export async function deleteManagedUser(userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: {
      action: "delete",
      userId
    }
  });

  if (error) throw error;
  return data;
}

export async function fetchPublishedQuestions() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("questions")
    .select("*, question_options(*)")
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapQuestion);
}

export async function saveQuestionToSupabase(question) {
  if (!supabase) return question;

  const questionPayload = {
    stem: question.stem,
    category: question.category,
    topic: question.topic || null,
    difficulty: question.difficulty,
    explanation: question.explanation || "",
    key_point: question.keyPoint || null,
    image_path: question.imageUrl || null,
    status: "published"
  };

  const shouldUpdate = isUuid(question.id);
  const { data: questionRow, error: questionError } = shouldUpdate
    ? await supabase
        .from("questions")
        .update({ ...questionPayload, updated_at: new Date().toISOString() })
        .eq("id", question.id)
        .select("id")
        .single()
    : await supabase
        .from("questions")
        .insert(questionPayload)
        .select("id")
        .single();

  if (questionError) throw questionError;

  const questionId = questionRow.id;
  const { error: deleteOptionsError } = await supabase
    .from("question_options")
    .delete()
    .eq("question_id", questionId);

  if (deleteOptionsError) throw deleteOptionsError;

  const optionRows = question.options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => option.text?.trim())
    .map(({ option, index }) => ({
      question_id: questionId,
      option_text: option.text.trim(),
      is_correct: index === 0,
      position: index
    }));

  if (optionRows.length) {
    const { error: optionsError } = await supabase.from("question_options").insert(optionRows);
    if (optionsError) throw optionsError;
  }

  return fetchQuestionById(questionId);
}

export async function deleteQuestionFromSupabase(questionId) {
  if (!supabase || !isUuid(questionId)) return;

  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) throw error;
}

export async function createQuizAttempt({ categoryFilter, difficultyFilter, mode, studentId, total }) {
  if (!supabase || !studentId) return null;

  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      student_id: studentId,
      mode,
      category_filter: categoryFilter,
      difficulty_filter: difficultyFilter,
      total
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function finishQuizAttempt({ attemptId, score, total }) {
  if (!supabase || !attemptId) return null;

  const { data, error } = await supabase
    .from("quiz_attempts")
    .update({
      finished_at: new Date().toISOString(),
      score,
      total
    })
    .eq("id", attemptId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordQuizAnswer({ attemptId, isCorrect, questionId, selectedOptionId }) {
  if (!supabase || !attemptId || !questionId) return null;

  const { data, error } = await supabase
    .from("quiz_answers")
    .insert({
      attempt_id: attemptId,
      question_id: questionId,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
