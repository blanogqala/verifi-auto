const accountTypes = ['Cheque', 'Savings', 'Transmission'];

export function maskAccountNumber(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 6) return '';
  return `••••${digits.slice(-4)}`;
}

/** Persist masked demo banking details. The full account number is never returned. */
export function bankingRecord(input: any) {
  const bankName = String(input?.bankName || '').trim();
  const accountHolder = String(input?.accountHolder || '').trim();
  const accountType = String(input?.accountType || '').trim();
  const branchCode = String(input?.branchCode || '').trim();
  const accountNumber = String(input?.accountNumber || '').trim();
  if (!bankName) return { error: 'Enter the bank name.' };
  if (!accountHolder) return { error: 'Enter the account holder.' };
  if (!accountTypes.includes(accountType)) return { error: 'Choose an account type.' };
  if (!/^\d{6,16}$/.test(accountNumber))
    return { error: 'Enter a sample account number of 6 to 16 digits.' };
  if (!/^\d{4,8}$/.test(branchCode))
    return { error: 'Enter a sample branch code of 4 to 8 digits.' };
  return {
    record: {
      bankName,
      accountHolder,
      accountType,
      branchCode,
      maskedAccount: maskAccountNumber(accountNumber),
      configured: true,
    },
  };
}
