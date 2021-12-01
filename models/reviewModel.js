const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, "Review cannot be empty"]
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now()
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'Review must belong to a tour']
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must belong to a user']
        }
    }, {
        //to make virtual properties show up on object and JSON
        //Virtual Properties are Fields that are not saved in the database but calculated using other values
        toJSON: {virtuals: true},
        toObject: {virtuals: true},
    });

reviewSchema.pre(/^find/, function (next) {
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({
    //     path: 'user',
    //     select: 'name photo'
    // });

    this.populate({
        path: 'user',
        select: 'name photo'
    });
    next();
});

//To prevent a user dropping review on the same tour more than once
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//We made this a static method because we needed to call the aggregate method on the model
reviewSchema.statics.calcAverageRatings = async function (tourId) {
   const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);

   if (stats.length > 0) {
       await Tour.findByIdAndUpdate(tourId, {
           ratingsQuantity: stats[0].nRating,
           ratingsAverage: stats[0].avgRating
       });
   }else{
       await Tour.findByIdAndUpdate(tourId, {
           ratingsQuantity: 0,
           ratingsAverage: 0
       });
   }

};


reviewSchema.post('save', function () {
    // this points to the current review
    this.constructor.calcAverageRatings(this.tour);
});

//Use this to save to current tour in the current instance
 reviewSchema.pre(/^findOneAnd/, async function(next) {
     this.r = await this.findOne();
     next();
 });

reviewSchema.post(/^findOneAnd/, async function() {
    // await this.findOne(); does NOT work here, query has already exxecuted
     await this.r.constructor.calcAverageRatings(this.r.tour);
});





const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;