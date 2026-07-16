require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Truck = mongoose.model('Truck', new mongoose.Schema({}, { strict: false }), 'trucks');
  const QuarryPurchase = mongoose.model('QuarryPurchase', new mongoose.Schema({}, { strict: false }), 'quarrypurchases');
  const ATC = mongoose.model('ATC', new mongoose.Schema({}, { strict: false }), 'atcs');

  const truck = await Truck.findOne({ plateNumber: /ABC.?752.?XK/i });
  console.log('Truck:', JSON.stringify(truck, null, 2));
  if (!truck) { await mongoose.disconnect(); return; }

  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 60 * 1000);
  console.log('Now:', now.toISOString(), 'Cutoff (30min ago):', cutoff.toISOString());

  const recentPurchases = await QuarryPurchase.find({ truck: truck._id }).sort({ date: -1 }).limit(5);
  console.log('Recent QuarryPurchase records for this truck:', JSON.stringify(recentPurchases, null, 2));

  const busyOn = await QuarryPurchase.findOne({ truck: truck._id, date: { $gte: cutoff } });
  console.log('Matches busy query (date >= cutoff)?', !!busyOn);

  const busyAtc = await ATC.findOne({ assignedTruck: truck._id, status: { $ne: 'closed' } });
  console.log('Busy on ATC?', JSON.stringify(busyAtc, null, 2));

  await mongoose.disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
