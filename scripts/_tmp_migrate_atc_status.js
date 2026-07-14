require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ATC = mongoose.model('ATC', new mongoose.Schema({ status: String, bagsRemaining: Number }), 'atcs');
  const delivered = await ATC.find({ status: 'delivered' }).select('atcNumber status bagsRemaining');
  const collecting = await ATC.find({ status: 'collecting' }).select('atcNumber status bagsRemaining');
  console.log('Found delivered:', JSON.stringify(delivered, null, 2));
  console.log('Found collecting:', JSON.stringify(collecting, null, 2));

  for (const atc of delivered) {
    const newStatus = atc.bagsRemaining === 0 ? 'closed' : 'arrived';
    await ATC.updateOne({ _id: atc._id }, { $set: { status: newStatus } });
    console.log(`ATC ${atc.atcNumber}: delivered -> ${newStatus}`);
  }
  for (const atc of collecting) {
    await ATC.updateOne({ _id: atc._id }, { $set: { status: 'assigned' } });
    console.log(`ATC ${atc.atcNumber}: collecting -> assigned`);
  }
  await mongoose.disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
