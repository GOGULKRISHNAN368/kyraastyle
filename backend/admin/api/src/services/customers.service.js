import Customer from '../models/Customer.js';

export async function listCustomers() {
  return Customer.find()
    .select('name email phone lastLoginAt createdAt updatedAt')
    .sort({ lastLoginAt: -1, createdAt: -1 })
    .lean();
}
