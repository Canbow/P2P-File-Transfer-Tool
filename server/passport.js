const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./db');

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id, done) => {
    db.get('SELECT id, username, email, avatarUrl FROM users WHERE id = ?', [id], (err, row) => {
        done(err, row);
    });
});

// 1. Local Strategy
passport.use(new LocalStrategy({ usernameField: 'username' }, (username, password, done) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect username.' });
        
        if (!user.password_hash) return done(null, false, { message: 'Please login using OAuth.' });
        
        bcrypt.compare(password, user.password_hash, (err, res) => {
            if (res) return done(null, user);
            return done(null, false, { message: 'Incorrect password.' });
        });
    });
}));

// 2. Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
    callbackURL: "/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
      // Find or create user
      db.get('SELECT * FROM users WHERE googleId = ?', [profile.id], (err, user) => {
          if (err) return done(err);
          if (user) {
              return done(null, user);
          } else {
              // Create new user
              const username = profile.displayName || `user_${profile.id}`;
              const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
              const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
              
              db.run(`INSERT INTO users (username, email, googleId, avatarUrl) VALUES (?, ?, ?, ?)`, 
                  [username, email, profile.id, avatarUrl], 
                  function(err) {
                      if (err) return done(err);
                      db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                          return done(err, newUser);
                      });
                  }
              );
          }
      });
  }
));

// 3. GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'dummy_id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy_secret',
    callbackURL: "/auth/github/callback"
  },
  (accessToken, refreshToken, profile, done) => {
      db.get('SELECT * FROM users WHERE githubId = ?', [profile.id], (err, user) => {
          if (err) return done(err);
          if (user) {
              return done(null, user);
          } else {
              const username = profile.username || `github_${profile.id}`;
              const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
              const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
              
              db.run(`INSERT INTO users (username, email, githubId, avatarUrl) VALUES (?, ?, ?, ?)`, 
                  [username, email, profile.id, avatarUrl], 
                  function(err) {
                      if (err) return done(err);
                      db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                          return done(err, newUser);
                      });
                  }
              );
          }
      });
  }
));

module.exports = passport;
