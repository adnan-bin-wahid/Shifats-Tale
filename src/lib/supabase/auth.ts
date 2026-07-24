import type { Database } from "../../types/database.types";

export type AuthDestination =
  | "UNAUTHENTICATED"
  | "TEACHER_DASHBOARD"
  | "STUDENT_DASHBOARD"
  | "PENDING_APPROVAL"
  | "ACCOUNT_DISABLED"
  | "INVALID_PROFILE";

export interface AuthResolution {
  destination: AuthDestination;
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  studentProfile: Database["public"]["Tables"]["student_profiles"]["Row"] | null;
  user: any | null;
}

/**
 * Authoritatively resolves the destination page for the currently logged-in user session.
 * Accepts a Supabase client as a parameter, making the logic fully testable.
 */
export async function resolveUserDestination(supabase: any): Promise<AuthResolution> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        destination: "UNAUTHENTICATED",
        profile: null,
        studentProfile: null,
        user: null,
      };
    }

    // 1. Fetch user's role profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError);
      return {
        destination: "INVALID_PROFILE",
        profile: null,
        studentProfile: null,
        user,
      };
    }

    // 2. Check general account suspension
    if (profile.account_status === "DISABLED" || profile.account_status === "ARCHIVED") {
      return {
        destination: "ACCOUNT_DISABLED",
        profile,
        studentProfile: null,
        user,
      };
    }

    // 3. Resolve destination by role
    if (profile.role === "TEACHER") {
      if (profile.account_status === "ACTIVE") {
        return {
          destination: "TEACHER_DASHBOARD",
          profile,
          studentProfile: null,
          user,
        };
      }
      return {
        destination: "INVALID_PROFILE",
        profile,
        studentProfile: null,
        user,
      };
    }

    if (profile.role === "STUDENT") {
      // Fetch student details profile
      const { data: studentProfile, error: studentError } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (studentError || !studentProfile) {
        console.error("Error fetching student profile details:", studentError);
        return {
          destination: "INVALID_PROFILE",
          profile,
          studentProfile: null,
          user,
        };
      }

      // Check if student has at least one active batch enrollment
      const { count, error: enrollError } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studentProfile.id)
        .eq("status", "ACTIVE");

      if (enrollError) {
        console.error("Error checking student enrollments status:", enrollError);
        return {
          destination: "INVALID_PROFILE",
          profile,
          studentProfile,
          user,
        };
      }

      if (count !== null && count > 0) {
        return {
          destination: "STUDENT_DASHBOARD",
          profile,
          studentProfile,
          user,
        };
      } else {
        return {
          destination: "PENDING_APPROVAL",
          profile,
          studentProfile,
          user,
        };
      }
    }

    return {
      destination: "INVALID_PROFILE",
      profile,
      studentProfile: null,
      user,
    };
  } catch (err) {
    console.error("Critical error in resolveUserDestination:", err);
    return {
      destination: "INVALID_PROFILE",
      profile: null,
      studentProfile: null,
      user: null,
    };
  }
}

export async function resolveAuthenticatedDestination(
  supabaseOverride?: any
): Promise<AuthResolution> {
  const supabase =
    supabaseOverride ??
    (await (await import("./server")).createClient());

  return resolveUserDestination(supabase);
}

