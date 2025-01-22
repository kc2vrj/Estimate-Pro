const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const session = require('express-session');
const passport = require('./lib/passport');
const User = require('./models/User');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 8080;

// Initialize Next.js
const nextApp = next({ dev, hostname, port });
const nextHandler = nextApp.getRequestHandler();

const startServer = async () => {
  try {
    await nextApp.prepare();
    const app = express();

    // Initialize user table
    try {
      await User.initialize();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    }

    // Session middleware
    app.use(
      session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: true,
          secure: !dev,
          sameSite: 'lax'
        },
        name: 'connect.sid'
      })
    );

    // Initialize Passport and restore authentication state from session
    app.use(passport.initialize());
    app.use(passport.session());

    // Parse JSON bodies
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Middleware to check if user is admin
    const isAdmin = (req, res, next) => {
      if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
        return next();
      }
      res.status(403).json({ message: 'Access denied' });
    };

    // Authentication routes
    app.post('/api/auth/login', (req, res, next) => {
      passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json(info);
        if (!user.is_approved && user.role !== 'admin') {
          return res.status(401).json({ message: 'Your account is pending approval' });
        }
        req.logIn(user, (err) => {
          if (err) return next(err);
          return res.json({ user: { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role,
            is_approved: user.is_approved 
          }});
        });
      })(req, res, next);
    });

    app.post('/api/auth/logout', (req, res) => {
      req.logout((err) => {
        if (err) {
          return res.status(500).json({ message: 'Error logging out' });
        }
        res.status(200).json({ message: 'Logged out successfully' });
      });
    });

    app.post('/api/auth/register', async (req, res) => {
      try {
        const { email, password, name } = req.body;
        const userId = await User.create({ email, password, name });
        const user = await User.findById(userId);
        res.status(200).json({ 
          message: 'Registration successful. Please wait for admin approval.',
          user: { 
            id: user.id, 
            email: user.email, 
            name: user.name,
            is_approved: user.is_approved 
          }
        });
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    });

    // Admin routes for managing users
    app.get('/api/admin/pending-users', isAdmin, async (req, res) => {
      try {
        const users = await User.getAllPendingUsers();
        res.json({ users });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.post('/api/admin/approve-user/:id', isAdmin, async (req, res) => {
      try {
        await User.approveUser(req.params.id);
        res.json({ message: 'User approved successfully' });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    app.post('/api/admin/deny-user/:id', isAdmin, async (req, res) => {
      try {
        await User.denyUser(req.params.id);
        res.json({ message: 'User denied successfully' });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Add user info endpoint
    app.get('/api/auth/user', (req, res) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          is_approved: req.user.is_approved
        }
      });
    });

    // Let Next.js handle all other routes
    app.all('*', (req, res) => {
      return nextHandler(req, res);
    });

    app.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  } catch (error) {
    console.error('An error occurred starting the server:', error);
    process.exit(1);
  }
};

startServer();
