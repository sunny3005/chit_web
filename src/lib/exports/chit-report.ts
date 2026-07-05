import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { formatCurrency } from "@/lib/format";

export type ChitReportRow = {
  monthLabel: string;
  status: string;
  auctionAmount: string | null;
  agentCommission: string | null;
  payablePerPerson: string | null;
  winnerName: string | null;
  membersPaid: number;
  totalMembers: number;
  collected: string;
};

export type ChitReportData = {
  chitName: string;
  totalAmount: string;
  numberOfMonths: number;
  numberOfMembers: number;
  rows: ChitReportRow[];
};

export async function buildChitReportExcel(data: ChitReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Collection Report");

  sheet.columns = [
    { header: "Month", key: "month", width: 20 },
    { header: "Status", key: "status", width: 14 },
    { header: "Auction Amount", key: "auction", width: 16 },
    { header: "Commission", key: "commission", width: 14 },
    { header: "Payable/Person", key: "payable", width: 16 },
    { header: "Winner", key: "winner", width: 20 },
    { header: "Members Paid", key: "paidCount", width: 14 },
    { header: "Collected", key: "collected", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  data.rows.forEach((row) => {
    sheet.addRow({
      month: row.monthLabel,
      status: row.status.replace("_", " "),
      auction: row.auctionAmount ? Number(row.auctionAmount) : "-",
      commission: row.agentCommission ? Number(row.agentCommission) : "-",
      payable: row.payablePerPerson ? Number(row.payablePerPerson) : "-",
      winner: row.winnerName ?? "-",
      paidCount: `${row.membersPaid}/${row.totalMembers}`,
      collected: Number(row.collected),
    });
  });

  sheet.insertRow(
    1,
    `${data.chitName} — Collection Report  (Total: ${data.totalAmount}, ${data.numberOfMonths} months, ${data.numberOfMembers} members)`
  );
  sheet.mergeCells("A1:H1");
  sheet.getRow(1).font = { bold: true, size: 13 };
  sheet.getRow(2).font = { bold: true };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function buildChitReportPdf(data: ChitReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(`${data.chitName} — Collection Report`);
    doc
      .fontSize(10)
      .fillColor("#555")
      .text(
        `Total: ${formatCurrency(data.totalAmount)}  ·  ${data.numberOfMonths} months  ·  ${data.numberOfMembers} members`
      );
    doc.moveDown(1);
    doc.fillColor("#000");

    const colX = [36, 150, 240, 330, 420, 510, 620, 700];
    const headers = [
      "Month",
      "Status",
      "Auction",
      "Commission",
      "Payable/P",
      "Winner",
      "Paid",
      "Collected",
    ];
    const headerY = doc.y;
    doc.fontSize(9).font("Helvetica-Bold");
    headers.forEach((h, i) => doc.text(h, colX[i], headerY, { width: 90 }));
    doc.moveDown(0.5);
    doc.moveTo(36, doc.y).lineTo(806, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(9);
    data.rows.forEach((row) => {
      const y = doc.y;
      doc.text(row.monthLabel, colX[0], y, { width: 110 });
      doc.text(row.status.replace("_", " "), colX[1], y, { width: 85 });
      doc.text(row.auctionAmount ? formatCurrency(row.auctionAmount) : "-", colX[2], y, {
        width: 85,
      });
      doc.text(
        row.agentCommission ? formatCurrency(row.agentCommission) : "-",
        colX[3],
        y,
        { width: 85 }
      );
      doc.text(
        row.payablePerPerson ? formatCurrency(row.payablePerPerson) : "-",
        colX[4],
        y,
        { width: 85 }
      );
      doc.text(row.winnerName ?? "-", colX[5], y, { width: 105 });
      doc.text(`${row.membersPaid}/${row.totalMembers}`, colX[6], y, { width: 75 });
      doc.text(formatCurrency(row.collected), colX[7], y, { width: 90 });
      doc.moveDown(0.6);
    });

    doc.end();
  });
}
