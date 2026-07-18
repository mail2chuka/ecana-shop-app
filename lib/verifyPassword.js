import bcrypt from 'bcryptjs';
import User from '@/models/User';

export async function verifyOwnPassword(userId, password) {
  if (!password) return false;
  const user = await User.findById(userId).select('+password');
  if (!user) return false;
  return bcrypt.compare(password, user.password);
}

// Returns 'no_pin_set' | 'incorrect' | 'ok' so callers can give a specific error
// ("set your PIN first" vs "wrong PIN") instead of one generic rejection.
export async function verifyOwnPin(userId, pin) {
  if (!pin) return 'incorrect';
  const user = await User.findById(userId).select('+actionPin');
  if (!user) return 'incorrect';
  if (!user.actionPin) return 'no_pin_set';
  const ok = await bcrypt.compare(pin, user.actionPin);
  return ok ? 'ok' : 'incorrect';
}
