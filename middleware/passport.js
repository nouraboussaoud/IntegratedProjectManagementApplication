const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

module.exports = function () {
  passport.use(
    new GitHubStrategy(
      {
        clientID:"Ov23lizUQfOx6neZKDi7",
        clientSecret: "5fd2bb56606be3b4ec03c5e1b9b6fd2f12ea62dc",
        callbackURL: "http://localhost:5000/api/users/auth/github/callback",
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        console.log("GitHub Profile:", profile);
        console.log("Access Token:", accessToken);
  
        if (!accessToken) {
          console.error("Failed to get access token");
          return done(new Error("GitHub did not return an access token"), null);
        }
  
        let user = await User.findOne({ githubId: profile.id });
  
        if (!user) {
          user = new User({
            githubId: profile.id,
            name: profile.displayName || profile.username,
            email: profile.emails?.[0]?.value || null,
            provider: "github",
            profilePic: profile.photos?.[0]?.value || null,
            isActive: true,
          });
  
          await user.save();
        }
        return done(null, user);
      }
    )
  );
};  