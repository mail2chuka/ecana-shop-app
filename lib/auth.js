import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from './db';
import User from '@/models/User';
import Organization from '@/models/Organization';
import { runUnscoped } from '@/lib/tenantScope';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

if (!NEXTAUTH_SECRET) {
  throw new Error('Please define NEXTAUTH_SECRET in .env');
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        emailOrUsername: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.emailOrUsername || !credentials?.password) {
          throw new Error('Email/username and password required');
        }
        await dbConnect();
        const raw = credentials.emailOrUsername.trim();
        const identifier = raw.toLowerCase();
        // Login identities are globally unique, so this lookup runs unscoped (we don't yet know the
        // tenant — this query is what resolves it). Every other query in the app is org-scoped.
        const user = await runUnscoped(() => User.findOne({
          $or: [
            { email: identifier },
            { username: identifier },
            { phone: raw },
          ],
          isActive: true
        }).select('+password'));
        if (!user) throw new Error('Invalid credentials');
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) throw new Error('Invalid credentials');
        // Org name is carried on the session for per-tenant branding (invoices/statements). Cached
        // in the token; a name change takes effect on next login, which is fine for Phase 1.
        const org = user.organization
          ? await runUnscoped(() => Organization.findById(user.organization).select('name isActive subscriptionStatus'))
          : null;
        // Suspension is only enforced at login (not per-request) — a deliberate scope tradeoff so this
        // doesn't cost a DB lookup on every request. An already-logged-in session keeps working until
        // its JWT expires (up to 8h) or they log out.
        if (org && (!org.isActive || org.subscriptionStatus === 'canceled')) {
          throw new Error('This organization\'s access has been suspended. Contact the platform owner.');
        }
        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, linkedCustomer: user.linkedCustomer ? user.linkedCustomer.toString() : null, organization: user.organization ? user.organization.toString() : null, organizationName: org?.name || null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = user.role; token.linkedCustomer = user.linkedCustomer; token.organization = user.organization; token.organizationName = user.organizationName; }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.linkedCustomer = token.linkedCustomer;
      session.user.organization = token.organization;
      session.user.organizationName = token.organizationName;
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8,
  },
  jwt: {
    maxAge: 60 * 60 * 8,
  },
  secret: NEXTAUTH_SECRET,
};
