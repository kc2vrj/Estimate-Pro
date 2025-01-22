import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '../../../models/User';

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
          console.log('Raw credentials:', credentials);
          console.log('NextAuth authorize called with email:', credentials?.email);
          console.log('NextAuth received password length:', credentials?.password?.length);
          
          if (!credentials?.email || !credentials?.password) {
            console.log('Missing credentials');
            throw new Error('Email and password are required');
          }

          const result = await User.authenticate(credentials.email, credentials.password);
          console.log('Authentication result:', result ? 'Success' : 'Failed');
          
          if (!result) {
            console.log('Authentication failed - no result returned');
            throw new Error('Invalid email or password');
          }

          const user = {
            id: result.id.toString(),
            email: result.email,
            name: result.name,
            role: result.role
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role
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
