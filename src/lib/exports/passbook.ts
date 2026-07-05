import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { formatCurrency } from "@/lib/format";

export type PassbookRow = {
  monthIndex: number;
  monthLabel: string;
  status: "PENDING" | "AUCTION_DONE" | "COMPLETED";
  payablePerPerson: string | null;
  amountPaid: string | null;
  paid: boolean;
};

export type PassbookData = {
  chitName: string;
  memberName: string;
  memberPhone: string;
  prized: boolean;
  prizedMonth: number | null;
  rows: PassbookRow[];
};

export async function buildPassbookExcel(data: PassbookData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Passbook");

  sheet.columns = [
    { header: "Month", key: "month", width: 22 },
    { header: "Status", key: "status", width: 16 },
    { header: "Payable", key: "payable", width: 16 },
    { header: "Paid Amount", key: "paidAmount", width: 16 },
    { header: "Paid?", key: "paid", width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };

  data.rows.forEach((row) => {
    sheet.addRow({
      month: row.monthLabel,
      status: row.status.replace("_", " "),
      payable: row.payablePerPerson ? Number(row.payablePerPerson) : "-",
      paidAmount: row.amountPaid ? Number(row.amountPaid) : "-",
      paid: row.paid ? "Yes" : "No",
    });
  });

  sheet.insertRow(1, [`${data.chitName} — ${data.memberName} (${data.memberPhone})`]);
  sheet.mergeCells("A1:E1");
  sheet.getRow(1).font = { bold: true, size: 13 };
  sheet.getRow(2).font = { bold: true };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function buildPassbookPdf(data: PassbookData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(`${data.chitName} — Member Passbook`, { align: "left" });
    doc.fontSize(11).fillColor("#555").text(`${data.memberName}  ·  ${data.memberPhone}`);
    if (data.prized) {
      doc
        .fillColor("#b3401f")
        .text(`Prized member${data.prizedMonth ? ` (Month ${data.prizedMonth})` : ""}`);
    }
    doc.moveDown(1);
    doc.fillColor("#000");

    const colX = [40, 220, 320, 420, 500];
    const headerY = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Month", colX[0], headerY);
    doc.text("Status", colX[1], headerY);
    doc.text("Payable", colX[2], headerY);
    doc.text("Paid", colX[3], headerY);
    doc.text("Settled", colX[4], headerY);
    doc.moveDown(0.5);
    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .strokeColor("#ccc")
      .stroke();
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(10);
    data.rows.forEach((row) => {
      const y = doc.y;
      doc.text(row.monthLabel, colX[0], y, { width: 170 });
      doc.text(row.status.replace("_", " "), colX[1], y, { width: 90 });
      doc.text(
        row.payablePerPerson ? formatCurrency(row.payablePerPerson) : "-",
        colX[2],
        y,
        { width: 90 }
      );
      doc.text(row.amountPaid ? formatCurrency(row.amountPaid) : "-", colX[3], y, {
        width: 70,
      });
      doc.text(row.paid ? "Yes" : "No", colX[4], y, { width: 50 });
      doc.moveDown(0.6);
    });

    doc.end();
  });
}
