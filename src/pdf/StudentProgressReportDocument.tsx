/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import path from "path";
import type { StudentProgressReportData } from "@/lib/reports/student-progress-report-data";

Font.register({
  family: "HindSiliguri",
  fonts: [
    {
      src: path.join(process.cwd(), "public/fonts/HindSiliguri-Regular.ttf"),
      fontWeight: "normal",
    },
    {
      src: path.join(process.cwd(), "public/fonts/HindSiliguri-Bold.ttf"),
      fontWeight: "bold",
    },
  ],
});

const navy = "#071A3D";
const blue = "#2456B3";
const gold = "#FBB503";
const slate = "#475569";
const border = "#DCE3ED";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    paddingBottom: 44,
    fontFamily: "HindSiliguri",
    fontSize: 8,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 7,
    backgroundColor: navy,
    marginBottom: 12,
  },
  logo: { width: 120, height: 36, objectFit: "contain" },
  headerLabel: { color: gold, fontSize: 7, fontWeight: "bold", marginTop: 5 },
  title: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold", marginTop: 2 },
  subtitle: { color: "#BFDBFE", fontSize: 7, marginTop: 2 },
  reportMeta: {
    width: 175,
    borderRadius: 5,
    padding: 8,
    backgroundColor: "#132B5D",
  },
  metaText: { color: "#DBEAFE", fontSize: 7, marginBottom: 2, textAlign: "right" },
  metaStrong: { color: "#FFFFFF", fontWeight: "bold" },
  profileGrid: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    marginBottom: 10,
  },
  profileColumn: { width: "50%" },
  profileColumnBorder: { borderLeftWidth: 1, borderLeftColor: border, paddingLeft: 10 },
  eyebrow: { color: blue, fontSize: 6.5, fontWeight: "bold", textTransform: "uppercase" },
  profileName: { fontSize: 12, fontWeight: "bold", marginTop: 3, marginBottom: 5 },
  infoRow: { flexDirection: "row", marginBottom: 2 },
  infoLabel: { width: 83, color: "#64748B" },
  infoValue: { flex: 1, fontWeight: "bold" },
  summaryRow: { flexDirection: "row", gap: 7, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 9, borderWidth: 1, borderColor: border, borderRadius: 5 },
  summaryValue: { fontSize: 14, fontWeight: "bold", color: navy },
  summaryTitle: { marginTop: 3, color: slate, fontSize: 6.5, fontWeight: "bold" },
  summaryNote: { marginTop: 2, color: "#94A3B8", fontSize: 6 },
  section: { marginBottom: 11 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: navy,
  },
  sectionTitle: { color: "#FFFFFF", fontSize: 9, fontWeight: "bold" },
  sectionNote: { color: "#BFDBFE", fontSize: 6.5 },
  table: { borderWidth: 1, borderTopWidth: 0, borderColor: border },
  tableHeader: { flexDirection: "row", backgroundColor: "#EAF0F8", paddingVertical: 5 },
  tableHeaderText: { fontSize: 6.5, fontWeight: "bold", color: "#334155" },
  tableRow: { flexDirection: "row", paddingVertical: 5, borderTopWidth: 1, borderTopColor: "#EEF2F7" },
  cell: { paddingHorizontal: 5, fontSize: 7 },
  strong: { fontWeight: "bold" },
  muted: { color: "#64748B" },
  success: { color: "#047857", fontWeight: "bold" },
  danger: { color: "#BE123C", fontWeight: "bold" },
  subjectName: { width: "24%" },
  subjectProgress: { width: "14%" },
  subjectUnits: { width: "13%" },
  subjectAverage: { width: "14%" },
  subjectExam: { width: "19%" },
  subjectAssignment: { width: "16%" },
  dateCol: { width: "11%" },
  examNameCol: { width: "25%" },
  examSubjectCol: { width: "17%" },
  marksCol: { width: "12%" },
  pctCol: { width: "9%" },
  gradeCol: { width: "8%" },
  rankCol: { width: "7%" },
  statusCol: { width: "11%" },
  assignmentNameCol: { width: "35%" },
  assignmentSubjectCol: { width: "20%" },
  assignmentDueCol: { width: "15%" },
  assignmentScoreCol: { width: "15%" },
  assignmentStatusCol: { width: "15%" },
  unitGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  unitCard: { width: "49%", borderWidth: 1, borderColor: border, borderRadius: 5, padding: 8 },
  unitTitle: { fontWeight: "bold", marginBottom: 4 },
  unitLine: { fontSize: 6.5, color: slate, lineHeight: 1.4, marginBottom: 2 },
  remarkGrid: { flexDirection: "row", gap: 10 },
  remarkBox: { width: "50%", minHeight: 78, borderWidth: 1, borderColor: border, borderRadius: 5, padding: 9 },
  remarkTitle: { fontWeight: "bold", fontSize: 8, marginBottom: 6 },
  remarkLine: { borderBottomWidth: 1, borderBottomColor: "#CBD5E1", marginTop: 14 },
  observation: { fontSize: 7, lineHeight: 1.4, marginBottom: 3, color: slate },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  signature: { width: 165, alignItems: "center" },
  signatureLine: { width: "100%", borderBottomWidth: 1, borderBottomColor: "#475569", marginBottom: 4 },
  signatureText: { fontSize: 7, fontWeight: "bold", textTransform: "uppercase" },
  footer: { position: "absolute", bottom: 17, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6, color: "#94A3B8" },
});

function percent(value: number) {
  return `${value.toFixed(1).replace(".0", "")}%`;
}

function date(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

function humanize(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function resultStyle(status: string) {
  if (["PASSED", "REVIEWED"].includes(status)) return styles.success;
  if (["FAILED", "ABSENT", "NOT_SUBMITTED"].includes(status)) return styles.danger;
  return styles.muted;
}

export function StudentProgressReportDocument({
  data,
}: {
  data: StudentProgressReportData;
}) {
  const logoPath = path.join(process.cwd(), "public/images/alternate_logo.png");

  return (
    <Document title={`${data.student.fullName} - Student Progress Report`} author={data.branding.title}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} wrap={false}>
          <View>
            <Image src={logoPath} style={styles.logo} />
            <Text style={styles.headerLabel}>OFFICIAL ACADEMIC DOCUMENT</Text>
            <Text style={styles.title}>Student Progress Report</Text>
            <Text style={styles.subtitle}>{data.branding.title} · {data.branding.subtitle}</Text>
          </View>
          <View style={styles.reportMeta}>
            <Text style={[styles.metaText, styles.metaStrong]}>{data.reportId}</Text>
            <Text style={styles.metaText}>Batch: {data.batch.name} ({data.batch.code})</Text>
            <Text style={styles.metaText}>Generated: {data.generatedAt}</Text>
          </View>
        </View>

        <View style={styles.profileGrid} wrap={false}>
          <View style={styles.profileColumn}>
            <Text style={styles.eyebrow}>Student profile</Text>
            <Text style={styles.profileName}>{data.student.fullName}</Text>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Student ID</Text><Text style={styles.infoValue}>{data.student.studentCode}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Academic level</Text><Text style={styles.infoValue}>{data.student.academicLevel}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Institution</Text><Text style={styles.infoValue}>{data.student.institution}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Guardian</Text><Text style={styles.infoValue}>{data.student.guardianName}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Guardian phone</Text><Text style={styles.infoValue}>{data.student.guardianPhone}</Text></View>
          </View>
          <View style={[styles.profileColumn, styles.profileColumnBorder]}>
            <Text style={styles.eyebrow}>Batch information</Text>
            <Text style={styles.profileName}>{data.batch.name}</Text>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Batch code</Text><Text style={styles.infoValue}>{data.batch.code}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Level</Text><Text style={styles.infoValue}>{data.batch.academicLevel}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Duration</Text><Text style={styles.infoValue}>{date(data.batch.startDate)} – {date(data.batch.endDate)}</Text></View>
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Enrollment</Text><Text style={styles.infoValue}>{humanize(data.enrollment.status)}</Text></View>
          </View>
        </View>

        <View style={styles.summaryRow} wrap={false}>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{percent(data.summary.syllabusPercentage)}</Text><Text style={styles.summaryTitle}>SYLLABUS PROGRESS</Text><Text style={styles.summaryNote}>{data.summary.completedUnits}/{data.summary.totalUnits} units completed</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{percent(data.summary.exam.averagePercentage)}</Text><Text style={styles.summaryTitle}>EXAM AVERAGE</Text><Text style={styles.summaryNote}>{data.summary.exam.recorded}/{data.summary.exam.published} results recorded</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{data.summary.overallGrade}</Text><Text style={styles.summaryTitle}>OVERALL GRADE</Text><Text style={styles.summaryNote}>{data.summary.performanceBand}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{percent(data.summary.assignment.submissionRate)}</Text><Text style={styles.summaryTitle}>ASSIGNMENTS</Text><Text style={styles.summaryNote}>{data.summary.assignment.submitted}/{data.summary.assignment.assigned} submitted</Text></View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader} wrap={false}><Text style={styles.sectionTitle}>Subject-wise Academic Progress</Text><Text style={styles.sectionNote}>Published academic records only</Text></View>
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed><Text style={[styles.cell, styles.tableHeaderText, styles.subjectName]}>Subject</Text><Text style={[styles.cell, styles.tableHeaderText, styles.subjectProgress]}>Syllabus</Text><Text style={[styles.cell, styles.tableHeaderText, styles.subjectUnits]}>Units</Text><Text style={[styles.cell, styles.tableHeaderText, styles.subjectAverage]}>Exam avg.</Text><Text style={[styles.cell, styles.tableHeaderText, styles.subjectExam]}>Exam record</Text><Text style={[styles.cell, styles.tableHeaderText, styles.subjectAssignment]}>Assignments</Text></View>
            {data.subjects.length ? data.subjects.map((subject) => (
              <View key={subject.id} style={styles.tableRow} wrap={false}>
                <Text style={[styles.cell, styles.subjectName, styles.strong]}>{subject.name}{"\n"}<Text style={styles.muted}>{subject.code}</Text></Text>
                <Text style={[styles.cell, styles.subjectProgress, styles.success]}>{percent(subject.syllabus.percentage)}</Text>
                <Text style={[styles.cell, styles.subjectUnits]}>{subject.syllabus.completedUnits}/{subject.syllabus.totalUnits}</Text>
                <Text style={[styles.cell, styles.subjectAverage, styles.success]}>{percent(subject.exam.averagePercentage)}</Text>
                <Text style={[styles.cell, styles.subjectExam]}>{subject.exam.recorded}/{subject.exam.published} records · {subject.exam.passed} passed</Text>
                <Text style={[styles.cell, styles.subjectAssignment]}>{subject.assignment.submitted}/{subject.assignment.assigned} submitted</Text>
              </View>
            )) : <View style={styles.tableRow}><Text style={[styles.cell, styles.muted]}>No visible subjects in this batch.</Text></View>}
          </View>
        </View>

        {data.subjects.some((subject) => subject.syllabus.totalUnits > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader} wrap={false}><Text style={styles.sectionTitle}>Completed and Remaining Units</Text><Text style={styles.sectionNote}>Curriculum detail</Text></View>
            <View style={[styles.unitGrid, { paddingTop: 7 }]}>
              {data.subjects.filter((subject) => subject.syllabus.totalUnits > 0).map((subject) => (
                <View key={subject.id} style={styles.unitCard} wrap={false}>
                  <Text style={styles.unitTitle}>{subject.name} · {percent(subject.syllabus.percentage)}</Text>
                  <Text style={styles.unitLine}>Completed: {subject.syllabus.completedTitles.join(", ") || "None yet"}</Text>
                  <Text style={styles.unitLine}>Remaining: {subject.syllabus.remainingTitles.join(", ") || "None"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section} break>
          <View style={styles.sectionHeader} wrap={false}><Text style={styles.sectionTitle}>Exam Performance History</Text><Text style={styles.sectionNote}>{data.summary.exam.recorded}/{data.summary.exam.published} published records · {data.summary.exam.passed} passed</Text></View>
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed><Text style={[styles.cell, styles.tableHeaderText, styles.dateCol]}>Date</Text><Text style={[styles.cell, styles.tableHeaderText, styles.examNameCol]}>Exam</Text><Text style={[styles.cell, styles.tableHeaderText, styles.examSubjectCol]}>Subject</Text><Text style={[styles.cell, styles.tableHeaderText, styles.marksCol]}>Marks</Text><Text style={[styles.cell, styles.tableHeaderText, styles.pctCol]}>%</Text><Text style={[styles.cell, styles.tableHeaderText, styles.gradeCol]}>Grade</Text><Text style={[styles.cell, styles.tableHeaderText, styles.rankCol]}>Rank</Text><Text style={[styles.cell, styles.tableHeaderText, styles.statusCol]}>Status</Text></View>
            {data.exams.length ? data.exams.map((exam) => {
              const subject = data.subjects.find((item) => item.id === exam.subjectId);
              return <View key={exam.id} style={styles.tableRow} wrap={false}><Text style={[styles.cell, styles.dateCol]}>{date(exam.examDate)}</Text><Text style={[styles.cell, styles.examNameCol, styles.strong]}>{exam.name}{"\n"}<Text style={styles.muted}>{humanize(exam.examType)}</Text></Text><Text style={[styles.cell, styles.examSubjectCol]}>{subject?.name || "—"}</Text><Text style={[styles.cell, styles.marksCol, styles.strong]}>{exam.obtainedMarks === null ? "—" : `${exam.obtainedMarks}/${exam.totalMarks}`}</Text><Text style={[styles.cell, styles.pctCol]}>{exam.percentage === null ? "—" : percent(exam.percentage)}</Text><Text style={[styles.cell, styles.gradeCol, styles.strong]}>{exam.grade}</Text><Text style={[styles.cell, styles.rankCol]}>{exam.rank || "—"}</Text><Text style={[styles.cell, styles.statusCol, resultStyle(exam.status)]}>{humanize(exam.status)}</Text></View>;
            }) : <View style={styles.tableRow}><Text style={[styles.cell, styles.muted]}>No published exam result is available.</Text></View>}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader} wrap={false}><Text style={styles.sectionTitle}>Assignment Performance</Text><Text style={styles.sectionNote}>{percent(data.summary.assignment.submissionRate)} submission rate · {percent(data.summary.assignment.averagePercentage)} reviewed average</Text></View>
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed><Text style={[styles.cell, styles.tableHeaderText, styles.assignmentNameCol]}>Assignment</Text><Text style={[styles.cell, styles.tableHeaderText, styles.assignmentSubjectCol]}>Subject</Text><Text style={[styles.cell, styles.tableHeaderText, styles.assignmentDueCol]}>Due</Text><Text style={[styles.cell, styles.tableHeaderText, styles.assignmentScoreCol]}>Score</Text><Text style={[styles.cell, styles.tableHeaderText, styles.assignmentStatusCol]}>Status</Text></View>
            {data.assignments.length ? data.assignments.map((assignment) => {
              const subject = data.subjects.find((item) => item.id === assignment.subjectId);
              return <View key={assignment.id} style={styles.tableRow} wrap={false}><Text style={[styles.cell, styles.assignmentNameCol, styles.strong]}>{assignment.title}{"\n"}<Text style={styles.muted}>{humanize(assignment.assignmentType)}</Text></Text><Text style={[styles.cell, styles.assignmentSubjectCol]}>{subject?.name || "—"}</Text><Text style={[styles.cell, styles.assignmentDueCol]}>{date(assignment.dueAt)}</Text><Text style={[styles.cell, styles.assignmentScoreCol, styles.strong]}>{assignment.marksObtained === null ? "—" : `${assignment.marksObtained}/${assignment.totalMarks}`}</Text><Text style={[styles.cell, styles.assignmentStatusCol, resultStyle(assignment.status)]}>{humanize(assignment.status)}</Text></View>;
            }) : <View style={styles.tableRow}><Text style={[styles.cell, styles.muted]}>No published assignments in this batch.</Text></View>}
          </View>
        </View>

        <View style={styles.remarkGrid} wrap={false}>
          <View style={styles.remarkBox}>
            <Text style={styles.remarkTitle}>Published Teacher Observations</Text>
            {data.teacherObservations.length ? data.teacherObservations.map((observation, index) => <Text key={`${observation}-${index}`} style={styles.observation}>• {observation}</Text>) : <Text style={styles.observation}>No published exam remarks are available.</Text>}
          </View>
          <View style={styles.remarkBox}>
            <Text style={styles.remarkTitle}>Teacher&apos;s Remarks</Text>
            <View style={styles.remarkLine} /><View style={styles.remarkLine} /><View style={styles.remarkLine} />
          </View>
        </View>

        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signature}><View style={styles.signatureLine} /><Text style={styles.signatureText}>Guardian Signature</Text></View>
          <View style={styles.signature}><View style={styles.signatureLine} /><Text style={styles.signatureText}>Authorized Teacher Signature</Text></View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.branding.address || data.branding.title}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          <Text style={styles.footerText}>{[data.branding.phone, data.branding.email].filter(Boolean).join(" · ")}</Text>
        </View>
      </Page>
    </Document>
  );
}
