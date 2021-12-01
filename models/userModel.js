const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
   name: {
       type: String,
       require: [true, 'Please we need your name']
   },
    email: {
        type: String,
        require: [true, 'Please we need your email'],
        unique: true,
        lowercase: true, //Coverts user input to lowercase before saving
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: String,
    role: {
       type: String,
       enum: ['user', 'guide', 'lead-guide', 'admin'],
       default: 'user'
    },
    password: {
       type: String,
       required: [true, 'Please provide a password'],
       minlength: 8,
       select: false //Prevents the password field from showing in any output
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            //This custom validation works with save and create only
            //If needed use save to perform update operation
            validator: function (el) {
                return el === this.password
            },
            message: 'Passwords are the same'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
       type: Boolean,
       default: true,
       select: false
    }
});

userSchema.pre('save', async function (next) {
    //Only runs this function if password is modified
    if (!this.isModified('password')) return next();

    //Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);

    //Now we remove the confirm password field so it won't be saved in the database
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000; //Put at 1s in the past
    next();
});

userSchema.pre(/^find/, function (next) {
    // This points to the current query
    this.find({ active: { $ne: false } }); //Returns documents only with active field equal to 2
    next();
});



userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt){
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );

        console.log(changedTimestamp, JWTTimestamp);
        return JWTTimestamp < changedTimestamp;
    }

    //False means Not Changed
    return false;
}
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;