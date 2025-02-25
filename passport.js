require('dotenv').config();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const User = require('./models/User');
const { registerUser, loginUser } = require('./controllers/userController');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:5000/auth/google/callback"
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });
            if (!user) {
              // Créer un nouvel utilisateur avec les informations de Google
              const tempPassword = crypto.randomBytes(8).toString('hex'); // Générer un mot de passe temporaire
              const hashedPassword = await bcrypt.hash(tempPassword, 10);
              const verificationToken = crypto.randomBytes(20).toString('hex'); 
              // Créer un nouvel utilisateur avec les informations de Google
              user = new User({
                  googleId: profile.id,
                  name: profile.displayName,
                  email: profile.emails[0].value,
                  password: hashedPassword,// Enregistrer le mot de passe hashé
                  profilePic: profile.photos[0].value, // Enregistrer l'image de profil
                  provider: 'google', // Enregistrer le fournisseur
                  isActive: true ,// Activer le compte directement
                  verificationToken: verificationToken 
              });
  
              await user.save();
        }

        // Générer un token JWT
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1h' }
        );

        // Ajouter le token à l'objet utilisateur
        user.token = token;
        await user.save();

        return done(null, user);
    } catch (error) {
        console.error('Error during Google authentication:', error);
        return done(error, null);
    }
  }
));
    
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });
    
    passport.deserializeUser(async (id, done) => {
      const user = await User.findById(id);
      done(null, user);
    });
  
module.exports = passport;