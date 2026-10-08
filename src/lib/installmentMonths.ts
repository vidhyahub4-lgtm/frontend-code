// The backend only sends an installment number (1, 2, 3 ...). For monthly
// plans the session starts in April, so 1 = April ... 12 = March.
const MONTH_NAMES = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March",
];

export function installmentMonthName(no: number): string {
  return no >= 1 ? (MONTH_NAMES[(no - 1) % 12] ?? `Month ${no}`) : `Month ${no}`;
}
