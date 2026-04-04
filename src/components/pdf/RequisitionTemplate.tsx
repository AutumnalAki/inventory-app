import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type RequisitionPdfItem = {
  name?: string;
  quantity?: number;
  unit?: string;
};

export type RequisitionPdfSignatures = {
  requestedBy?: string;
  endorsedBy?: string;
  releasedBy?: string;
  approvedBy?: string;
  signatureDates?: {
    requestedBy?: string;
    endorsedBy?: string;
    releasedBy?: string;
    approvedBy?: string;
  };
  documentCode?: {
    effectiveDate?: string;
    revisionNo?: string;
    revisionDate?: string;
  };
};

export type RequisitionPdfData = {
  id?: string;
  logoSrc?: string;
  logoDataUrl?: string;
  studentName?: string;
  studentNumber?: string;
  purpose?: string;
  instructor?: string;
  programSection?: string;
  courseCode?: string;
  room?: string;
  timeOfUse?: string;
  items?: RequisitionPdfItem[];
  signatures?: RequisitionPdfSignatures;
  status?: string;
  requisitionType?: string;
  dateOut?: string | null;
  dateIn?: string | null;
  createdAt?: string;
};

type Props = {
  requisition: RequisitionPdfData;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    backgroundColor: "#ffffff",
    padding: 20,
  },
  paper: {
    borderWidth: 2,
    borderColor: "#000000",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#000000",
    minHeight: 90,
  },
  headerLeft: {
    flexDirection: "row",
    flexGrow: 1,
    padding: 10,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#9a8500",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  logoImage: {
    width: 40,
    height: 40,
    objectFit: "contain",
  },
  titleWrap: {
    justifyContent: "center",
  },
  titleSchool: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 2,
  },
  titleMain: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 2,
  },
  titleSub: {
    fontSize: 10,
    fontWeight: 700,
  },
  docCode: {
    width: 170,
    borderLeftWidth: 2,
    borderColor: "#000000",
  },
  docCodeHeader: {
    backgroundColor: "#000000",
    color: "#ffffff",
    textAlign: "center",
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 3,
  },
  docCodeGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
  },
  docCodeCell: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: "#000000",
    padding: 3,
    minHeight: 40,
  },
  docCodeCellLast: {
    borderRightWidth: 0,
  },
  docCodeLabel: {
    fontSize: 6,
    fontWeight: 700,
    marginBottom: 4,
  },
  docCodeValue: {
    fontSize: 7,
    textAlign: "center",
    marginTop: 2,
  },
  docCodeFooter: {
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
    paddingVertical: 4,
  },
  infoGrid: {
    borderBottomWidth: 2,
    borderColor: "#000000",
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
    minHeight: 26,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoHalf: {
    flex: 1,
    flexDirection: "row",
    borderRightWidth: 2,
    borderColor: "#000000",
  },
  infoHalfLast: {
    borderRightWidth: 0,
  },
  infoLabel: {
    width: 92,
    borderRightWidth: 1,
    borderColor: "#000000",
    fontWeight: 700,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  infoValue: {
    flex: 1,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  tableWrap: {
    borderBottomWidth: 2,
    borderColor: "#000000",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#000000",
    minHeight: 24,
    backgroundColor: "#f2f2f2",
  },
  tableBodyRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
    minHeight: 22,
  },
  tableBodyRowLast: {
    borderBottomWidth: 0,
  },
  cItem: {
    width: "45%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  cQty: {
    width: "12%",
    borderRightWidth: 1,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  cUnit: {
    width: "10%",
    borderRightWidth: 1,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  cOut: {
    width: "16%",
    borderRightWidth: 1,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  cIn: {
    width: "17%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
  },
  signatureWrap: {
    borderBottomWidth: 2,
    borderColor: "#000000",
  },
  signatureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  signatureCell: {
    width: "50%",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    minHeight: 74,
    padding: 6,
  },
  signatureCellRight: {
    borderRightWidth: 0,
  },
  signatureCellBottom: {
    borderBottomWidth: 0,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderColor: "#000000",
    marginTop: 12,
    marginBottom: 6,
  },
  signatureRole: {
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
  },
  signatureLabel: {
    fontSize: 7,
    textAlign: "center",
    marginTop: 2,
  },
  signatureName: {
    fontSize: 8,
    textAlign: "center",
    marginTop: 2,
  },
  signatureDate: {
    fontSize: 7,
    textAlign: "center",
    marginTop: 6,
  },
  footer: {
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 7,
  },
  footerRight: {
    textAlign: "right",
  },
});

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const yyyy = String(parsed.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
};

const safe = (value?: string | null) => (value || "").trim();

const makeTableRows = (items: RequisitionPdfItem[] = [], rowCount = 18) => {
  const normalized = items
    .filter((item) => safe(item.name) || Number(item.quantity || 0) > 0)
    .map((item) => ({
      name: safe(item.name),
      quantity: Number(item.quantity) || 0,
      unit: safe(item.unit),
    }));

  const rows = [...normalized];
  while (rows.length < rowCount) {
    rows.push({ name: "", quantity: 0, unit: "" });
  }

  return rows.slice(0, rowCount);
};

const RequisitionTemplate: React.FC<Props> = ({ requisition }) => {
  const logoSrc = requisition.logoDataUrl || requisition.logoSrc || "/favicon.ico";
  const signatures = requisition.signatures || {};
  const signatureDates = signatures.signatureDates || {};
  const documentCode = signatures.documentCode || {};
  const rows = makeTableRows(requisition.items || []);

  const leftFields = [
    ["Name:", safe(requisition.studentName)],
    ["Student No.:", safe(requisition.studentNumber)],
    ["Purpose:", safe(requisition.purpose)],
    ["Instructor:", safe(requisition.instructor)],
  ] as const;

  const rightFields = [
    ["Program & Section:", safe(requisition.programSection)],
    ["Course/Code:", safe(requisition.courseCode)],
    ["Room:", safe(requisition.room)],
    ["Time of use:", safe(requisition.timeOfUse)],
  ] as const;

  const signatureCells = [
    {
      role: "STUDENT/INSTRUCTOR",
      label: "Requested by",
      name: safe(signatures.requestedBy),
      date: formatDate(signatureDates.requestedBy),
    },
    {
      role: "INSTRUCTOR/ADVISER",
      label: "Endorsed by",
      name: safe(signatures.endorsedBy),
      date: formatDate(signatureDates.endorsedBy),
    },
    {
      role: "LAB. TECHNICIAN",
      label: "Released by",
      name: safe(signatures.releasedBy),
      date: formatDate(signatureDates.releasedBy),
    },
    {
      role: "LAB. HEAD/PROF. CHAIR",
      label: "Approved by",
      name: safe(signatures.approvedBy),
      date: formatDate(signatureDates.approvedBy),
    },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.paper}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoCircle}>
                <Image src={logoSrc} style={styles.logoImage} />
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.titleSchool}>COLEGIO DE MUNTINLUPA</Text>
                <Text style={styles.titleMain}>REQUISITION FORM</Text>
                <Text style={styles.titleSub}>EQUIPMENT, SUPPLIES AND APPARATUS</Text>
              </View>
            </View>

            <View style={styles.docCode}>
              <Text style={styles.docCodeHeader}>DOCUMENT CODE</Text>
              <View style={styles.docCodeGrid}>
                <View style={styles.docCodeCell}>
                  <Text style={styles.docCodeLabel}>Effective Date</Text>
                  <Text style={styles.docCodeValue}>{formatDate(documentCode.effectiveDate)}</Text>
                </View>
                <View style={styles.docCodeCell}>
                  <Text style={styles.docCodeLabel}>Revision No.</Text>
                  <Text style={styles.docCodeValue}>{safe(documentCode.revisionNo) || "00"}</Text>
                </View>
                <View style={[styles.docCodeCell, styles.docCodeCellLast]}>
                  <Text style={styles.docCodeLabel}>Revision Date</Text>
                  <Text style={styles.docCodeValue}>{formatDate(documentCode.revisionDate)}</Text>
                </View>
              </View>
              <Text style={styles.docCodeFooter}>AUTOGEN-DLI-SUBMIT</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            {leftFields.map((left, index) => (
              <View
                key={left[0]}
                style={[
                  styles.infoRow,
                  ...(index === leftFields.length - 1 ? [styles.infoRowLast] : []),
                ]}
              >
                <View style={styles.infoHalf}>
                  <View style={styles.infoLabel}>
                    <Text>{left[0]}</Text>
                  </View>
                  <View style={styles.infoValue}>
                    <Text>{left[1]}</Text>
                  </View>
                </View>
                <View style={[styles.infoHalf, styles.infoHalfLast]}>
                  <View style={styles.infoLabel}>
                    <Text>{rightFields[index][0]}</Text>
                  </View>
                  <View style={styles.infoValue}>
                    <Text>{rightFields[index][1]}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tableWrap}>
            <View style={styles.tableHeaderRow}>
              <View style={styles.cItem}><Text style={styles.tableHeaderText}>Equipment/Supplies/Apparatus</Text></View>
              <View style={styles.cQty}><Text style={styles.tableHeaderText}>Quantity</Text></View>
              <View style={styles.cUnit}><Text style={styles.tableHeaderText}>Unit</Text></View>
              <View style={styles.cOut}><Text style={styles.tableHeaderText}>Date and Time Out</Text></View>
              <View style={styles.cIn}><Text style={styles.tableHeaderText}>Date and Time In</Text></View>
            </View>

            {rows.map((row, index) => (
              <View
                key={`${row.name}-${index}`}
                style={[
                  styles.tableBodyRow,
                  ...(index === rows.length - 1 ? [styles.tableBodyRowLast] : []),
                ]}
              >
                <View style={styles.cItem}><Text>{row.name}</Text></View>
                <View style={styles.cQty}><Text>{row.quantity > 0 ? String(row.quantity) : ""}</Text></View>
                <View style={styles.cUnit}><Text>{row.unit}</Text></View>
                <View style={styles.cOut}><Text>{index === 0 ? formatDate(requisition.dateOut || requisition.createdAt) : ""}</Text></View>
                <View style={styles.cIn}><Text>{index === 0 ? formatDate(requisition.dateIn) : ""}</Text></View>
              </View>
            ))}
          </View>

          <View style={styles.signatureWrap}>
            <View style={styles.signatureGrid}>
              {signatureCells.map((cell, index) => (
                <View
                  key={cell.label}
                  style={[
                    styles.signatureCell,
                    ...(index % 2 === 1 ? [styles.signatureCellRight] : []),
                    ...(index > 1 ? [styles.signatureCellBottom] : []),
                  ]}
                >
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureRole}>{cell.role}</Text>
                  <Text style={styles.signatureLabel}>{cell.label}</Text>
                  <Text style={styles.signatureName}>{cell.name}</Text>
                  <Text style={styles.signatureDate}>Date: {cell.date}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Text>ID: {safe(requisition.id)}</Text>
            <Text>
              Type: {safe(requisition.requisitionType).toUpperCase() || "N/A"} | Status: {safe(requisition.status) || "Reserved"}
            </Text>
            <Text style={styles.footerRight}>
              Rev No: {safe(documentCode.revisionNo) || "00"} | Effective: {formatDate(documentCode.effectiveDate)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default RequisitionTemplate;
