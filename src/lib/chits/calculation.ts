export type CalculationInput = {
  interestPercent: number;
  chitAmount: number;
  totalMonths: number;
  commissionPercent: number;
  totalMembers: number;
  auctionAmount: number;
};

export type CalculationResult = CalculationInput & {
  agentCommission: number;
  netAmount: number;
  dividend: number;
  dividendPerMember: number;
  payablePerPerson: number;
};

export function calculateAuction(input: CalculationInput): CalculationResult {
  const { chitAmount, totalMonths, commissionPercent, totalMembers, auctionAmount } =
    input;

  const agentCommission = (chitAmount * commissionPercent) / 100;
  const netAmount = chitAmount - auctionAmount;
  const dividend = auctionAmount - agentCommission;
  const dividendPerMember = dividend / totalMembers;
  const payablePerPerson = chitAmount / totalMonths - dividendPerMember;

  return {
    ...input,
    agentCommission,
    netAmount,
    dividend,
    dividendPerMember,
    payablePerPerson,
  };
}
