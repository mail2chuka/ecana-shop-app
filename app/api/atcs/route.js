import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ATC from '@/models/ATC';
import CementBrand from '@/models/CementBrand';
import Supplier from '@/models/Supplier';
import { logAudit } from '@/lib/audit';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const brand = searchParams.get('brand');
    const availableForSale = searchParams.get('availableForSale');
    
    const query = {};
    if (status) query.status = status;
    if (brand) query.cementBrand = brand;
    if (availableForSale === 'true') {
      query.status = { $in: ['assigned', 'collecting', 'arrived'] };
      query.bagsRemaining = { $gt: 0 };
    }
    
    const atcs = await ATC.find(query).sort({ atcDate: -1 }).limit(200);
    return NextResponse.json({ success: true, data: atcs });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json();
    const { atcNumber, cementBrand, atcDate, bagsPaidFor, notes } = body;
    if (!atcNumber || !cementBrand || !atcDate || !bagsPaidFor) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }
    if (bagsPaidFor <= 0) return NextResponse.json({ error: 'Bags must be > 0' }, { status: 400 });

    const exists = await ATC.findOne({ atcNumber: atcNumber.trim() });
    if (exists) return NextResponse.json({ error: 'ATC number already exists' }, { status: 400 });

    const brand = await CementBrand.findById(cementBrand);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.abbreviation) return NextResponse.json({ error: 'Brand abbreviation not set' }, { status: 400 });

    let supplierData = {};
    if (brand.supplier) {
      const s = await Supplier.findById(brand.supplier);
      if (s) supplierData = { supplier: s._id, supplierName: s.name };
    }

    const atc = await ATC.create({
      atcNumber: atcNumber.trim(),
      cementBrand,
      cementBrandName: brand.name,
      ...supplierData,
      atcDate: new Date(atcDate),
      bagsPaidFor: Number(bagsPaidFor),
      bagsRemaining: Number(bagsPaidFor),
      notes,
      createdBy: session.user.id,
      createdByName: session.user.name,
    });

    await logAudit({ userId: session.user.id, userName: session.user.name, action: 'created', entity: 'ATC', entityId: atc._id, after: atc });
    return NextResponse.json({ success: true, data: atc }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
