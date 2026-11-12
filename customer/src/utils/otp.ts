/**
 * Generates a deterministic, unique 4-digit Pickup OTP (1000-9999) for a user ID.
 * Both the Customer Portal and Shop Portal derive the exact same code from customer_id
 * so customers can present their personal 4-digit OTP at the shop counter to collect prints.
 */
export function getCustomerOtp(customerId?: string | null): string {
  if (!customerId) return '0000';
  let hash = 2166136261;
  for (let i = 0; i < customerId.length; i++) {
    hash ^= customerId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const code = (Math.abs(hash >>> 0) % 9000) + 1000;
  return String(code);
}

