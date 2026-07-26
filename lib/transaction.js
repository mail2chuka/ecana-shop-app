import Sale from '@/models/Sale';
import CustomerPayment from '@/models/CustomerPayment';
import ATC from '@/models/ATC';

export async function generateTransactionNumber(type) {
  // type should be 'SAL', 'PAY', or 'ATC'
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `${type}-${dateStr}`;

  let model;
  let fieldName;

  if (type === 'SAL') {
    model = Sale;
    fieldName = 'transactionNumber';
  } else if (type === 'PAY') {
    model = CustomerPayment;
    fieldName = 'transactionNumber';
  } else if (type === 'ATC') {
    model = ATC;
    fieldName = 'transactionNumber';
  } else {
    throw new Error('Invalid transaction type');
  }

  // Find the highest counter for today
  const regex = new RegExp(`^${prefix}-`);
  const lastTransaction = await model
    .findOne({ [fieldName]: regex })
    .sort({ [fieldName]: -1 });

  let counter = 1;
  if (lastTransaction) {
    const parts = lastTransaction[fieldName].split('-');
    counter = parseInt(parts[2] || 0) + 1;
  }

  const counterStr = String(counter).padStart(3, '0');
  return `${prefix}-${counterStr}`;
}
