import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '../../../models/User';

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const user = await User.findByEmail(credentials.email);
          if (!user) {
            throw new Error('No user found with this email');
          }

          const isValid = await User.validatePassword(user, credentials.password);
          if (!isValid) {
            throw new Error('Invalid password');
          }

          if (!user.is_approved && user.role !== 'admin') {
            throw new Error('Your account is pending approval');
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            is_approved: user.is_approved
          };
        } catch (error) {
          throw new Error(error.message);
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.is_approved = user.is_approved;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.is_approved = token.is_approved;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  },
  debug: process.env.NODE_ENV === 'development'
};

export default NextAuth(authOptions);
