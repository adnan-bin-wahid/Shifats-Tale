import test from "node:test";
import assert from "node:assert";
import {
  resolveAuthenticatedDestination,
  resolveUserDestination,
} from "../src/lib/supabase/auth";

// =========================================================================
// MOCK SUPABASE CLIENT BUILDER FOR TESTING ACCESS CONTROL RULES
// =========================================================================

class MockBuilder {
  table: string;
  options: any;
  filters: Record<string, any> = {};

  constructor(table: string, options?: any) {
    this.table = table;
    this.options = options;
  }

  select(fields?: string, selectOpts?: any) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters[col] = val;
    return this;
  }

  async maybeSingle() {
    if (this.table === "profiles") {
      return { data: this.options.profile, error: null };
    }
    if (this.table === "student_profiles") {
      return { data: this.options.studentProfile, error: null };
    }
    return { data: null, error: null };
  }

  async single() {
    return this.maybeSingle();
  }

  // Intercept the promise awaiter chain for count queries
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    let resultPromise: Promise<any>;
    if (this.table === "enrollments") {
      resultPromise = Promise.resolve({
        count: this.options.activeEnrollmentCount ?? 0,
        error: null,
      });
    } else {
      resultPromise = Promise.resolve({ data: null, error: null });
    }
    return resultPromise.then(onfulfilled, onrejected);
  }
}

function createMockSupabase(options: {
  user?: any;
  profile?: any;
  studentProfile?: any;
  activeEnrollmentCount?: number;
}) {
  return {
    auth: {
      getUser: async () => {
        if (options.user) return { data: { user: options.user }, error: null };
        return { data: { user: null }, error: new Error("No user session") };
      },
    },
    from: (table: string) => {
      return new MockBuilder(table, options);
    },
  };
}

// =========================================================================
// TEST SPECIFICATIONS
// =========================================================================

test("Auth & Routing Gating Rules Test Suite", async (t) => {
  
  await t.test("1. Unauthenticated user resolves to UNAUTHENTICATED destination", async () => {
    const mockSupabase = createMockSupabase({ user: null });
    const result = await resolveUserDestination(mockSupabase);
    
    assert.strictEqual(result.destination, "UNAUTHENTICATED");
    assert.strictEqual(result.profile, null);
    assert.strictEqual(result.studentProfile, null);
  });

  await t.test("2. Teacher with ACTIVE profile status resolves to TEACHER_DASHBOARD", async () => {
    const mockUser = { id: "user-teacher-uuid", email: "teacher@coaching.com" };
    const mockProfile = {
      id: "profile-teacher-uuid",
      auth_user_id: "user-teacher-uuid",
      role: "TEACHER",
      full_name: "Teacher Admin",
      email: "teacher@coaching.com",
      account_status: "ACTIVE",
    };

    const mockSupabase = createMockSupabase({
      user: mockUser,
      profile: mockProfile,
    });

    const result = await resolveUserDestination(mockSupabase);
    assert.strictEqual(result.destination, "TEACHER_DASHBOARD");
    assert.deepEqual(result.profile, mockProfile);
  });

  await t.test("3. Student with ACTIVE profile and 0 active enrollments resolves to PENDING_APPROVAL", async () => {
    const mockUser = { id: "user-student-uuid", email: "student@coaching.com" };
    const mockProfile = {
      id: "profile-student-uuid",
      auth_user_id: "user-student-uuid",
      role: "STUDENT",
      full_name: "Student Name",
      email: "student@coaching.com",
      account_status: "ACTIVE",
    };
    const mockStudentProfile = {
      id: "student-profile-uuid",
      profile_id: "profile-student-uuid",
      student_code: "ST-2026-000001",
      registration_status: "PENDING",
    };

    const mockSupabase = createMockSupabase({
      user: mockUser,
      profile: mockProfile,
      studentProfile: mockStudentProfile,
      activeEnrollmentCount: 0,
    });

    const result = await resolveUserDestination(mockSupabase);
    assert.strictEqual(result.destination, "PENDING_APPROVAL");
    assert.deepEqual(result.profile, mockProfile);
    assert.deepEqual(result.studentProfile, mockStudentProfile);
  });

  await t.test("4. Student with ACTIVE profile and >=1 active enrollment resolves to STUDENT_DASHBOARD", async () => {
    const mockUser = { id: "user-student-uuid", email: "student@coaching.com" };
    const mockProfile = {
      id: "profile-student-uuid",
      auth_user_id: "user-student-uuid",
      role: "STUDENT",
      full_name: "Student Name",
      email: "student@coaching.com",
      account_status: "ACTIVE",
    };
    const mockStudentProfile = {
      id: "student-profile-uuid",
      profile_id: "profile-student-uuid",
      student_code: "ST-2026-000001",
      registration_status: "APPROVED",
    };

    const mockSupabase = createMockSupabase({
      user: mockUser,
      profile: mockProfile,
      studentProfile: mockStudentProfile,
      activeEnrollmentCount: 2, // 2 active classes
    });

    const result = await resolveUserDestination(mockSupabase);
    assert.strictEqual(result.destination, "STUDENT_DASHBOARD");
    assert.deepEqual(result.profile, mockProfile);
    assert.deepEqual(result.studentProfile, mockStudentProfile);
  });

  await t.test("5. Disabled Student (account_status = DISABLED) resolves to ACCOUNT_DISABLED", async () => {
    const mockUser = { id: "user-student-uuid", email: "student@coaching.com" };
    const mockProfile = {
      id: "profile-student-uuid",
      auth_user_id: "user-student-uuid",
      role: "STUDENT",
      full_name: "Student Name",
      email: "student@coaching.com",
      account_status: "DISABLED",
    };

    const mockSupabase = createMockSupabase({
      user: mockUser,
      profile: mockProfile,
    });

    const result = await resolveUserDestination(mockSupabase);
    assert.strictEqual(result.destination, "ACCOUNT_DISABLED");
    assert.deepEqual(result.profile, mockProfile);
  });

  await t.test("6. Student with invalid profile state fails safely to INVALID_PROFILE", async () => {
    const mockUser = { id: "user-student-uuid", email: "student@coaching.com" };
    
    // Profile query returns null/error
    const mockSupabase = createMockSupabase({
      user: mockUser,
      profile: null,
    });

    const result = await resolveUserDestination(mockSupabase);
    assert.strictEqual(result.destination, "INVALID_PROFILE");
  });

  await t.test("7. Route gating simulation: Gating redirects behave correctly", () => {
    const simulateStudentLayout = (destination: string) => {
      if (destination === "UNAUTHENTICATED") return "redirect_to_login";
      if (destination === "TEACHER_DASHBOARD") return "redirect_to_teacher";
      if (destination === "PENDING_APPROVAL") return "redirect_to_pending";
      if (destination === "ACCOUNT_DISABLED") return "redirect_to_disabled";
      if (destination === "STUDENT_DASHBOARD") return "render_dashboard";
      return "redirect_to_login";
    };

    assert.strictEqual(simulateStudentLayout("STUDENT_DASHBOARD"), "render_dashboard");
    assert.strictEqual(simulateStudentLayout("PENDING_APPROVAL"), "redirect_to_pending");
    assert.strictEqual(simulateStudentLayout("ACCOUNT_DISABLED"), "redirect_to_disabled");
    assert.strictEqual(simulateStudentLayout("TEACHER_DASHBOARD"), "redirect_to_teacher");
    assert.strictEqual(simulateStudentLayout("UNAUTHENTICATED"), "redirect_to_login");
  });

  await t.test("8. Removing last active enrollment triggers redirection on reload", async () => {
    const mockUser = { id: "user-student-uuid", email: "student@coaching.com" };
    const mockProfile = {
      id: "profile-student-uuid",
      auth_user_id: "user-student-uuid",
      role: "STUDENT",
      full_name: "Student Name",
      email: "student@coaching.com",
      account_status: "ACTIVE",
    };
    const mockStudentProfile = {
      id: "student-profile-uuid",
      profile_id: "profile-student-uuid",
      student_code: "ST-2026-000001",
      registration_status: "APPROVED",
    };

    // User is active first
    const mockSupabaseActive = createMockSupabase({
      user: mockUser,
      profile: mockProfile,
      studentProfile: mockStudentProfile,
      activeEnrollmentCount: 1,
    });

    // User loses active enrollment
    const mockSupabaseInactive = createMockSupabase({
      user: mockUser,
      profile: mockProfile,
      studentProfile: mockStudentProfile,
      activeEnrollmentCount: 0,
    });

    const activeRes = await resolveUserDestination(mockSupabaseActive);
    assert.strictEqual(activeRes.destination, "STUDENT_DASHBOARD");

    const inactiveRes = await resolveUserDestination(mockSupabaseInactive);
    assert.strictEqual(inactiveRes.destination, "PENDING_APPROVAL");
  });

  await t.test("9. Production auth wrapper delegates to the real session resolver", async () => {
    const mockUser = { id: "user-teacher-uuid", email: "teacher@coaching.com" };
    const mockProfile = {
      id: "profile-teacher-uuid",
      auth_user_id: "user-teacher-uuid",
      role: "TEACHER",
      full_name: "Teacher Admin",
      email: "teacher@coaching.com",
      account_status: "ACTIVE",
    };

    const result = await resolveAuthenticatedDestination(
      createMockSupabase({
        user: mockUser,
        profile: mockProfile,
      })
    );

    assert.strictEqual(result.destination, "TEACHER_DASHBOARD");
    assert.deepEqual(result.user, mockUser);
    assert.deepEqual(result.profile, mockProfile);
  });
});
