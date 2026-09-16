import Razorpay from 'razorpay';

let instance = null;

// Returns a Razorpay client, or null when keys are not configured
export function getRazorpay() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  if (!instance) {
    instance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  }
  return instance;
}
