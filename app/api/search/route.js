import { NextResponse } from 'next/server';
import { getOrgSession, withOrg } from '@/lib/session';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import User from '@/models/User';
import ShopProduct from '@/models/ShopProduct';
import StoneDustProduct from '@/models/StoneDustProduct';
import CementBrand from '@/models/CementBrand';
import { STAFF_ROLES } from '@/lib/permissions';

const quickLinks = [
  { label: 'Dashboard', href: '/admin', group: 'Link' },
  { label: 'Quarry', href: '/admin/suppliers', group: 'Link' },
  { label: 'Cement Brands', href: '/admin/cement-brands', group: 'Link' },
  { label: 'Aggregate', href: '/admin/stonedust', group: 'Link' },
  { label: 'Trucks', href: '/admin/trucks', group: 'Link' },
  { label: 'Customers', href: '/admin/customers', group: 'Link' },
  { label: 'ATCs', href: '/admin/atcs', group: 'Link' },
  { label: 'Sales', href: '/admin/sales', group: 'Link' },
  { label: 'New Cement Sale', href: '/admin/sales/new/cement', group: 'Link' },
  { label: 'New Aggregate Sale', href: '/admin/sales/new/stonedust', group: 'Link' },
  { label: 'Shop', href: '/admin/shop', group: 'Link' },
  { label: 'Customer Payments', href: '/admin/payments', group: 'Link' },
  { label: 'Sales Report', href: '/admin/reports/sales', group: 'Link' },
  { label: 'Customer Balances', href: '/admin/reports/balances', group: 'Link' },
  { label: 'Per Customer Report', href: '/admin/reports/customers', group: 'Link' },
  { label: 'Per Product Report', href: '/admin/reports/products', group: 'Link' },
  { label: 'Truck Utilization Report', href: '/admin/reports/trucks', group: 'Link' },
  { label: 'Audit Log', href: '/admin/audit-log', group: 'Link' },
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function _h_GET(request) {
  try {
    const session = await getOrgSession();
    if (!session || !STAFF_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    const links = !q
      ? quickLinks.slice(0, 8)
      : quickLinks.filter((link) => link.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

    if (!q) {
      return NextResponse.json({
        success: true,
        data: {
          links,
          users: [],
          products: [],
        },
      });
    }

    const re = new RegExp(escapeRegex(q), 'i');

    const [customers, users, shopProducts, stoneDust, cementBrands] = await Promise.all([
      Customer.find({
        isActive: true,
        $or: [{ name: re }, { phone: re }, { businessName: re }, { customerId: re }],
      }, 'name phone businessName customerId').limit(6).lean(),
      User.find({
        isActive: true,
        $or: [{ name: re }, { email: re }, { username: re }],
      }, 'name email username role').limit(6).lean(),
      ShopProduct.find({ isActive: true, name: re }, 'name unit price').limit(6).lean(),
      StoneDustProduct.find({ isActive: true, $or: [{ quarryName: re }, { size: re }] }, 'quarryName size currentPricePerTonne').limit(6).lean(),
      CementBrand.find({ isActive: true, $or: [{ name: re }, { abbreviation: re }, { depotName: re }] }, 'name abbreviation depotName currentPricePerBag').limit(6).lean(),
    ]);

    const userResults = [
      ...customers.map((customer) => ({
        id: customer._id.toString(),
        title: customer.name,
        subtitle: [customer.customerId, customer.phone].filter(Boolean).join(' • '),
        type: 'Customer',
        href: `/admin/customers/${customer._id}`,
      })),
      ...users.map((user) => ({
        id: user._id.toString(),
        title: user.name,
        subtitle: [user.username || user.email, user.role].filter(Boolean).join(' • '),
        type: 'User',
        href: '/admin',
      })),
    ].slice(0, 10);

    const productResults = [
      ...shopProducts.map((product) => ({
        id: product._id.toString(),
        title: product.name,
        subtitle: `Shop • ${product.unit || 'unit'} • ₦${Number(product.price || 0).toLocaleString()}`,
        type: 'Shop Product',
        href: '/admin/shop',
      })),
      ...stoneDust.map((product) => ({
        id: product._id.toString(),
        title: `${product.quarryName || 'Quarry'} - ${product.size}`,
        subtitle: `Aggregate • ₦${Number(product.currentPricePerTonne || 0).toLocaleString()}/tonne`,
        type: 'Stone Dust',
        href: '/admin/stonedust',
      })),
      ...cementBrands.map((brand) => ({
        id: brand._id.toString(),
        title: brand.name,
        subtitle: `Cement Brand${brand.depotName ? ` • ${brand.depotName}` : ''}`,
        type: 'Cement Brand',
        href: '/admin/cement-brands',
      })),
    ].slice(0, 12);

    return NextResponse.json({
      success: true,
      data: {
        links,
        users: userResults,
        products: productResults,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export const GET = withOrg(_h_GET);
