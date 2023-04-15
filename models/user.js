const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const Schema = mongoose.Schema;
const UserSchema = new Schema({
  name: String,
  email: {
    type: String,
    trim:true,
    unique: true,
    required: true
  },

  password: {
    type: String,

    required: true
  },
  resetLink: {data: String, default: ''},
  address: { type: Schema.Types.ObjectId, ref: "Address" }
});
UserSchema.pre("save", function(next) {
  let user = this;
  if (this.isModified("password") || this.isNew) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        return next(err);
      }

      bcrypt.hash(user.password, salt, null, function(err, hash) {
        if (err) {
          return next(err);
        }

        user.password = hash;
        next();
      });
    });
  } else {
    return next();
  }
});

UserSchema.methods.comparePassword = function(password, next) {
  let user = this;
  return bcrypt.compareSync(password, user.password);
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
