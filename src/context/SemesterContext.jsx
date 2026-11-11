import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const SemesterContext = createContext(null);

export function SemesterProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [state, setState] = useState({
    semester: null,
    subjects: [],
    ready: false,
    error: false,
  });

  useEffect(() => {
    if (!userId) {
      setState({ semester: null, subjects: [], ready: false, error: false });
      return;
    }
    let cancelled = false;

    async function load() {
      const { data: sem, error: semError } = await supabase
        .from("semesters")
        .select("*")
        .eq("status", "active")
        .maybeSingle();
      if (cancelled) return;
      if (semError || !sem) {
        setState({ semester: null, subjects: [], ready: true, error: true });
        return;
      }

      const { data: subs, error: subError } = await supabase
        .from("subjects")
        .select("*")
        .or(`semester_id.eq.${sem.id},semester_id.is.null`)
        .order("sort_order");
      if (cancelled) return;
      setState({
        semester: sem,
        subjects: subs ?? [],
        ready: true,
        error: !!subError,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo(
    () => ({
      ...state,
      getSubject: (code) => state.subjects.find((s) => s.code === code),
    }),
    [state],
  );

  return (
    <SemesterContext.Provider value={value}>
      {children}
    </SemesterContext.Provider>
  );
}

export const useSemester = () => useContext(SemesterContext);
