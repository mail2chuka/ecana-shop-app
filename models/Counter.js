import mongoose from 'mongoose';
import { tenantPlugin } from '@/lib/tenantScope';

// Generic per-org atomic counter — findOneAndUpdate + $inc guarantees no two callers can ever get
// the same value, even under concurrent requests (unlike a "find the max, then add 1" scan).
const CounterSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

CounterSchema.index({ organization: 1, key: 1 }, { unique: true });

CounterSchema.plugin(tenantPlugin);

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
