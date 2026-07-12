import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from './db';
import User from '@/models/User';

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
        const identifier = credentials.emailOrUsername.toLowerCase();
        const user = await User.findOne({
          $or: [
            { email: identifier },
            { username: identifier }
          ],
          isActive: true
        }).select('+password');
        if (!user) throw new Error('Invalid credentials');
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) throw new Error('Invalid credentials');
        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = user.role; }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
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
