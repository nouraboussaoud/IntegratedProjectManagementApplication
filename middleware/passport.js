const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/users/auth/github/callback"
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if the user already exists in your database
        let user = await User.findOne({ githubId: profile.id });

        if (!user) {
            // If the user doesn't exist, create a new user
            user = new User({
                githubId: profile.id,
                name: profile.displayName || profile.username,
                email: profile.emails ? profile.emails[0].value : null,
                profilePic: profile.photos ? profile.photos[0].value : null,
                isActive: true // Automatically activate GitHub users
            });

            await user.save();
        }

        // Return the user object
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Serialize and Deserialize User
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});