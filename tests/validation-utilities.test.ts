(process.env as any).NODE_ENV = "test";
(process.env as any).NODE_TEST_CONTEXT = "true";

import test from "node:test";
import assert from "node:assert";

// Import validation schemas
import { registerSchema } from "../src/app/(auth)/register/register-view";
import { loginSchema } from "../src/app/(auth)/login/login-view";
import { batchSchema } from "../src/lib/validations/batch";
import { materialSchema, announcementSchema } from "../src/lib/validations/materials";
import { examSchema } from "../src/lib/validations/exams";
import { 
  studentProfileSelfSchema, 
  teacherProfileSelfSchema, 
  studentProfileTeacherEditSchema, 
  appSettingsSchema, 
  passwordChangeSchema 
} from "../src/lib/validations/profiles";

// Import utilities
import { formatCurrency } from "../src/lib/currency";
import { calculateGrade, calculatePassFailStatus, calculateCompetitionRanks } from "../src/lib/exams/grading";
import { validateUploadedFile, validateFileMagicBytes } from "../src/lib/cloudinary/validation";
import { escapeCSV } from "../src/lib/csv";

// =========================================================================
// 1. VALIDATION SCHEMAS UNIT TESTS
// =========================================================================

test("Validation Schemas Unit Tests", async (t) => {

  await t.test("1.1 Registration Schema", () => {
    // Valid student details
    const valid = registerSchema.safeParse({
      fullName: "Alice Johnson",
      email: "alice@test.com",
      phone: "01712345678",
      password: "password123",
      confirmPassword: "password123",
      academicLevel: "HSC 2026",
      institution: "Dhaka College",
      guardianName: "Bob Johnson",
      guardianPhone: "01812345678",
      address: "123 Green Road, Dhaka",
      dateOfBirth: "2008-05-15",
    });
    assert.ok(valid.success);

    // Mismatched passwords
    const badPassword = registerSchema.safeParse({
      fullName: "Alice Johnson",
      email: "alice@test.com",
      phone: "01712345678",
      password: "password123",
      confirmPassword: "password321",
      academicLevel: "HSC 2026",
      institution: "Dhaka College",
      guardianName: "Bob Johnson",
      guardianPhone: "01812345678",
      address: "123 Green Road, Dhaka",
    });
    assert.strictEqual(badPassword.success, false);
  });

  await t.test("1.2 Login Schema", () => {
    const valid = loginSchema.safeParse({
      email: "student@test.com",
      password: "password123",
    });
    assert.ok(valid.success);

    const invalidEmail = loginSchema.safeParse({
      email: "invalid-email",
      password: "password123",
    });
    assert.strictEqual(invalidEmail.success, false);
  });

  await t.test("1.3 Batch Schema", () => {
    const valid = batchSchema.safeParse({
      name: "Physics Model Test 2026",
      code: "PHYS-MT-01",
      subject: "Physics",
      academicLevel: "HSC 2026",
      startDate: "2026-07-01",
      monthlyFee: 1500,
      admissionFee: 500,
      capacity: 40,
      status: "OPEN",
      admissionOpen: true,
    });
    assert.ok(valid.success);

    const negativeFee = batchSchema.safeParse({
      name: "Physics Model Test 2026",
      code: "PHYS-MT-01",
      subject: "Physics",
      academicLevel: "HSC 2026",
      startDate: "2026-07-01",
      monthlyFee: -100,
    });
    assert.strictEqual(negativeFee.success, false);
  });

  await t.test("1.4 Material Schema & URL Validation", () => {
    // Valid link material with protocol
    const validLink = materialSchema.safeParse({
      batchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      title: "Lecture Notes",
      contentType: "LINK",
      status: "PUBLISHED",
      externalUrl: "https://example.com/lecture-1",
    });
    assert.ok(validLink.success);

    // Invalid link externalUrl protocol
    const badLink = materialSchema.safeParse({
      batchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      title: "Lecture Notes",
      contentType: "LINK",
      status: "PUBLISHED",
      externalUrl: "ftp://example.com/notes",
    });
    assert.strictEqual(badLink.success, false);
  });

  await t.test("1.5 Examination & Result Schemas", () => {
    // Valid exam structure
    const validExam = examSchema.safeParse({
      batchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      subjectId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      name: "Chemistry Weekly Test 3",
      examType: "WEEKLY_EXAM",
      examDate: "2026-06-25",
      totalMarks: 50,
      passMarks: 20,
    });
    assert.ok(validExam.success);

    // Pass marks exceeding total marks
    const invalidExam = examSchema.safeParse({
      batchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      subjectId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      name: "Chemistry Weekly Test 3",
      examType: "WEEKLY_EXAM",
      examDate: "2026-06-25",
      totalMarks: 50,
      passMarks: 60,
    });
    assert.strictEqual(invalidExam.success, false);
  });

  await t.test("1.6 Profiles and Settings Schemas", () => {
    const validSettings = appSettingsSchema.safeParse({
      coachingCenterName: "Shifat's Tales",
      shortName: "ST",
      studentIdPrefix: "ST",
      publicPhone: "01700000000",
      publicEmail: "info@shifatstales.com",
      address: "Chittagong, Bangladesh",
      defaultCurrency: "BDT",
      defaultTimezone: "Asia/Dhaka",
      academicSession: "2025-2026",
      defaultGradingScale: "Standard BDT Scale",
      pendingApprovalContactText: "Please contact Shifat directly.",
      disabledAccountContactText: "Your account is disabled.",
      studentRankVisible: true,
      completedBatchesVisible: true,
      gradesDisplayed: true,
    });
    assert.ok(validSettings.success);
  });
});

// =========================================================================
// 2. UTILITIES & CALCULATORS UNIT TESTS
// =========================================================================

test("Utilities & Calculations Unit Tests", async (t) => {

  await t.test("2.1 Student ID Formatting & Regex Match", () => {
    // Regex verification matching generated Student ID formats in db
    const studentCodeRegex = /^ST-[0-9]{4}-[0-9]{6}$/;
    assert.ok(studentCodeRegex.test("ST-2026-000015"));
    assert.ok(!studentCodeRegex.test("ST-26-015"));
  });

  await t.test("2.2 Currency Formatter (BDT)", () => {
    assert.strictEqual(formatCurrency(1500), "৳1,500");
    assert.strictEqual(formatCurrency(0), "৳0");
    assert.strictEqual(formatCurrency(null), "৳0");
    assert.strictEqual(formatCurrency(5000000), "৳50,00,000"); // Indian grouping format
  });

  await t.test("2.3 Date Formatter Helper", () => {
    const timezone = "Asia/Dhaka";
    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return "-";
      return new Date(dateStr).toLocaleDateString("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    assert.strictEqual(formatDate(null), "-");
    assert.strictEqual(formatDate("2026-06-20T00:00:00.000Z"), "Jun 20, 2026");
  });

  await t.test("2.4 Payment-status and Due Calculations", () => {
    const expected = 1500;
    
    // Auto status checks
    const getStatus = (paid: number, exp: number) => {
      if (paid === 0) return "UNPAID";
      if (paid < exp) return "PARTIALLY_PAID";
      return "PAID";
    };

    assert.strictEqual(getStatus(0, expected), "UNPAID");
    assert.strictEqual(getStatus(500, expected), "PARTIALLY_PAID");
    assert.strictEqual(getStatus(1500, expected), "PAID");

    // Due amounts calculations
    const getDue = (status: string, exp: number, paid: number) => {
      if (status === "WAIVED") return 0;
      return Math.max(exp - paid, 0);
    };

    assert.strictEqual(getDue("PAID", expected, 1500), 0);
    assert.strictEqual(getDue("PARTIALLY_PAID", expected, 500), 1000);
    assert.strictEqual(getDue("WAIVED", expected, 0), 0);
  });

  await t.test("2.5 Grade and Pass/Fail Calculations", () => {
    // Pass/fail state
    assert.strictEqual(calculatePassFailStatus(40, 33, "PRESENT"), "PASS");
    assert.strictEqual(calculatePassFailStatus(30, 33, "PRESENT"), "FAIL");
    assert.strictEqual(calculatePassFailStatus(45, 33, "ABSENT"), "ABSENT");

    // Grade boundary thresholds
    assert.strictEqual(calculateGrade(90), "A+");
    assert.strictEqual(calculateGrade(75), "A");
    assert.strictEqual(calculateGrade(65), "A-");
    assert.strictEqual(calculateGrade(55), "B");
    assert.strictEqual(calculateGrade(45), "C");
    assert.strictEqual(calculateGrade(35), "D");
    assert.strictEqual(calculateGrade(20), "F");
  });

  await t.test("2.6 Competition Rank Computations", () => {
    const records = [
      { id: "s1", obtained_marks: 85, attendance_status: "PRESENT" as const },
      { id: "s2", obtained_marks: 90, attendance_status: "PRESENT" as const },
      { id: "s3", obtained_marks: 85, attendance_status: "PRESENT" as const },
      { id: "s4", obtained_marks: null, attendance_status: "ABSENT" as const },
    ];

    const ranked = calculateCompetitionRanks(records);
    // Highest mark (90) gets Rank 1
    assert.strictEqual(ranked.find(r => r.id === "s2")?.rank, 1);
    // Ties (85) get Rank 2
    assert.strictEqual(ranked.find(r => r.id === "s1")?.rank, 2);
    assert.strictEqual(ranked.find(r => r.id === "s3")?.rank, 2);
    // Absent student gets null rank
    assert.strictEqual(ranked.find(r => r.id === "s4")?.rank, null);
  });

  await t.test("2.7 File Validations (MIME / Extensions / Magic Bytes)", () => {
    // Valid PDF file structure checks
    const validPdf = validateUploadedFile("lecture.pdf", "application/pdf", 1024 * 1024, "PDF");
    assert.ok(validPdf.isValid);

    // Mismatched file formats
    const badFile = validateUploadedFile("hacked.png", "application/pdf", 1024 * 1024, "PDF");
    assert.strictEqual(badFile.isValid, false);

    // Size limit exceeded images (10MB maximum limit)
    const bigImg = validateUploadedFile("image.png", "image/png", 12 * 1024 * 1024, "IMAGE");
    assert.strictEqual(bigImg.isValid, false);

    // Check magic signatures
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x0A]); // %PDF
    assert.ok(validateFileMagicBytes(pdfBuffer, "pdf"));

    const badBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    assert.strictEqual(validateFileMagicBytes(badBuffer, "pdf"), false);
  });

  await t.test("2.8 CSV Escaping Utility", () => {
    assert.strictEqual(escapeCSV("Plain Text"), "Plain Text");
    assert.strictEqual(escapeCSV("Text, with comma"), "\"Text, with comma\"");
    assert.strictEqual(escapeCSV("Text with \"quotes\""), "\"Text with \"\"quotes\"\"\"");
    assert.strictEqual(escapeCSV(null), "");
  });
});
