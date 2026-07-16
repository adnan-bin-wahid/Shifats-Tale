import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import path from "path";
import { ResultDocumentData, ResultRow } from "@/lib/exams/result-document-data";

// Register Bengali & Unicode supporting font directly from public/fonts
const regularFontPath = path.join(process.cwd(), "public/fonts/HindSiliguri-Regular.ttf");
const boldFontPath = path.join(process.cwd(), "public/fonts/HindSiliguri-Bold.ttf");

Font.register({
  family: "HindSiliguri",
  fonts: [
    { src: regularFontPath, fontWeight: "normal" },
    { src: boldFontPath, fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "HindSiliguri",
    fontSize: 9,
    padding: 30,
    paddingBottom: 45,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  // Header Banner
  headerContainer: {
    backgroundColor: "#010E62",
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  coachingTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  logoImage: {
    width: 150,
    height: 40,
    objectFit: "contain",
    marginBottom: 6,
  },
  coachingSubtitle: {
    color: "#FBB503",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
  },
  docTitleBadge: {
    backgroundColor: "#FBB503",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  docTitleText: {
    color: "#010E62",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  examInfoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    padding: 8,
    borderRadius: 4,
    width: 170,
  },
  examInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  examInfoLabel: {
    color: "#E5E7EB",
    fontSize: 8,
  },
  examInfoVal: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
  },
  goldDivider: {
    height: 2,
    backgroundColor: "#FBB503",
    marginBottom: 12,
    borderRadius: 1,
  },
  // Summary Strip
  summaryStrip: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderLeftWidth: 4,
    borderLeftColor: "#010E62",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 14,
    justifyContent: "space-between",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryLabel: {
    fontSize: 7.5,
    color: "#4B5563",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#010E62",
  },
  // Table
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#010E62",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  th: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center",
  },
  tableRowEven: {
    backgroundColor: "#F9FAFB",
  },
  td: {
    fontSize: 8.5,
    textAlign: "center",
  },
  // Columns widths
  colSl: { width: "6%" },
  colRank: { width: "8%" },
  colName: { width: "30%", textAlign: "left", paddingLeft: 4 },
  colId: { width: "14%" },
  colAtt: { width: "12%" },
  colMarks: { width: "10%" },
  colPct: { width: "10%" },
  colGrade: { width: "10%" },
  // Status Badges inside cell
  badgePassed: {
    color: "#059669",
    fontWeight: "bold",
  },
  badgeFailed: {
    color: "#DC2626",
    fontWeight: "bold",
  },
  badgeAbsent: {
    color: "#6B7280",
  },
  // Footer / Signatures
  footerContainer: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 7.5,
    color: "#6B7280",
    lineHeight: 1.4,
  },
  signatureBox: {
    width: 140,
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    marginBottom: 4,
  },
  signatureTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1F2937",
    textTransform: "uppercase",
  },
  signatureName: {
    fontSize: 7.5,
    color: "#4B5563",
  },
  // Page number fixed footer
  pageNumber: {
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#9CA3AF",
  },
});

interface Props {
  data: ResultDocumentData;
}

export const ExamResultDocument: React.FC<Props> = ({ data }) => {
  const { exam, branding, summary, results, generatedAt } = data;
  const logoPath = path.join(process.cwd(), "public/images/alternate_logo.png");

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header Section (Only rendered on the 1st page) */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Image src={logoPath} style={styles.logoImage} />
            <Text style={styles.coachingSubtitle}>{branding.subtitle}</Text>
            <View style={styles.docTitleBadge}>
              <Text style={styles.docTitleText}>Official Examination Result</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.examInfoBox}>
              <View style={styles.examInfoRow}>
                <Text style={styles.examInfoLabel}>Exam:</Text>
                <Text style={styles.examInfoVal}>{exam.title.substring(0, 18)}</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Text style={styles.examInfoLabel}>Batch:</Text>
                <Text style={styles.examInfoVal}>{exam.batch_name.substring(0, 15)}</Text>
              </View>
              <View style={styles.examInfoRow}>
                <Text style={styles.examInfoLabel}>Total / Pass:</Text>
                <Text style={styles.examInfoVal}>
                  {exam.total_marks} / {exam.pass_marks || "N/A"}
                </Text>
              </View>
              <View style={styles.examInfoRow}>
                <Text style={styles.examInfoLabel}>Date:</Text>
                <Text style={styles.examInfoVal}>{exam.exam_date || "N/A"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.goldDivider} />

        {/* Summary Strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Enrolled</Text>
            <Text style={styles.summaryValue}>{summary.enrolled}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Present</Text>
            <Text style={styles.summaryValue}>{summary.present}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Absent</Text>
            <Text style={styles.summaryValue}>{summary.absent}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#059669" }]}>{summary.passed}</Text>
            <Text style={styles.summaryLabel}>Passed</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#DC2626" }]}>{summary.failed}</Text>
            <Text style={styles.summaryLabel}>Failed</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryValue}>{summary.averageMark}</Text>
          </View>
        </View>

        {/* Results Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.th, styles.colSl]}>SL</Text>
            <Text style={[styles.th, styles.colRank]}>Rank</Text>
            <Text style={[styles.th, styles.colName]}>Student Name</Text>
            <Text style={[styles.th, styles.colId]}>Student ID</Text>
            <Text style={[styles.th, styles.colAtt]}>Attendance</Text>
            <Text style={[styles.th, styles.colMarks]}>Marks</Text>
            <Text style={[styles.th, styles.colPct]}>Score %</Text>
            <Text style={[styles.th, styles.colGrade]}>Grade</Text>
          </View>

          {results.map((row, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <View
                key={row.studentId}
                style={[styles.tableRow, isEven ? styles.tableRowEven : {}]}
                wrap={false}
              >
                <Text style={[styles.td, styles.colSl]}>{row.serial}</Text>
                <Text style={[styles.td, styles.colRank, { fontWeight: "bold", color: "#010E62" }]}>
                  {row.rank}
                </Text>
                <Text style={[styles.td, styles.colName, { fontWeight: "bold" }]}>
                  {row.studentName}
                </Text>
                <Text style={[styles.td, styles.colId, { color: "#4B5563" }]}>
                  {row.studentCode}
                </Text>
                <Text
                  style={[
                    styles.td,
                    styles.colAtt,
                    row.attendance === "PRESENT" ? styles.badgePassed : styles.badgeAbsent,
                  ]}
                >
                  {row.attendance}
                </Text>
                <Text style={[styles.td, styles.colMarks, { fontWeight: "bold" }]}>
                  {row.marks !== null ? row.marks : "-"}
                </Text>
                <Text style={[styles.td, styles.colPct]}>{row.percentage}</Text>
                <Text
                  style={[
                    styles.td,
                    styles.colGrade,
                    row.grade === "A+" || row.grade === "A" ? styles.badgePassed : {},
                    row.grade === "F" ? styles.badgeFailed : {},
                  ]}
                >
                  {row.grade}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer & Signature Box (Kept intact at bottom of document or last page) */}
        <View style={styles.footerContainer} wrap={false}>
          <View>
            <Text style={styles.footerText}>Prepared by: {branding.title} Portal</Text>
            <Text style={styles.footerText}>Generated Date: {generatedAt}</Text>
            <Text style={styles.footerText}>Contact: {branding.phone} | {branding.address}</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureTitle}>Authorized Signature</Text>
            <Text style={styles.signatureName}>{branding.teacherName}</Text>
          </View>
        </View>

        {/* Dynamic Page X of Y on every page */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};
