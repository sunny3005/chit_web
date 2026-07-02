import { formatCurrency } from "@/lib/format";

export function buildAuctionShareMessage(input: {
  chitName: string;
  monthLabel: string;
  auctionAmount: string;
  agentCommission: string;
  netAmount: string;
  dividend: string;
  dividendPerMember: string;
  payablePerPerson: string;
}) {
  const divider = "━".repeat(20);
  return [
    divider,
    input.chitName.toUpperCase(),
    `Month: ${input.monthLabel}`,
    divider,
    `Auction Amount   : ${formatCurrency(input.auctionAmount)}`,
    `Commission       : ${formatCurrency(input.agentCommission)}`,
    `Net Amount       : ${formatCurrency(input.netAmount)}`,
    `Dividend         : ${formatCurrency(input.dividend)}`,
    `Dividend/Member  : ${formatCurrency(input.dividendPerMember)}`,
    `Monthly Payable  : ${formatCurrency(input.payablePerPerson)}`,
    divider,
  ].join("\n");
}
