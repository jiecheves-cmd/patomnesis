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

export async function signOutUser() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
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

export async function fetchPublishedQuestions() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("questions")
    .select("*, question_options(*)")
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapQuestion).filter((question) => question.options.length >= 2);
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
