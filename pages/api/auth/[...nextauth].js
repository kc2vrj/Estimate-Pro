import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '../../../models/User';

// Initialize user model
User.initialize().catch(console.error);

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
  debug: true, // Enable debug mode
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        try {
          const result = await User.authenticate(credentials.email, credentials.password);
          
          if (!result) {
            throw new Error('Invalid email or password');
          }

          const user = {
            id: result.id.toString(),
            email: result.email,
            name: result.name,
            role: result.role,
            is_approved: result.is_approved
          };
          
          console.log('Returning authenticated user:', user);
          return user;
        } catch (error) {
          console.error('Authentication error:', error.message);
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
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role,
          is_approved: token.is_approved
        };
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error'
  }
};

export default NextAuth(authOptions);
