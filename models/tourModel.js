const mongoose = require('mongoose');
const slugify  = require('slugify');
// const User = require('./userModel');
const validator = require('validator');

//SCHEMA
const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour name must have less or equal than 40 characters'],
        minlength: [10, 'A tour name must have more or equal than 40 characters']
        // validate: [validator.isAlpha, 'Tour name must only contain characters, no space'] //From validator library
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'], //Accepts values only between the supplied array
        message: 'Difficulty is either easy, medium or difficult'
      },
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5.0, 'Rating must be below 5.0'],
        //Setter function runs each time there is a new value
        set: val => Math.round(val * 10) / 10 // 4.6666666, 46.666666, 47, 4.7
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
       type: Number,
       validate: {
           validator:   function (val) { //Not Arrow function to have access to 'this' variable that will point to this current document
              //This kind of validator will not work with update
              //'this' only points to current doc on New document creation
               //Library for custom validator on npm "Validator on github" i'e must use for validating complicated strings
               return val < this.price; // 100 < 200 == true else false
           },
           message: 'Discount price ({VALUE}) should be below the regular price',
       }
    },
    summary: {
        type: String,
        trim: true, //remove all the white space in the beginning and the end
        required: [true, 'A tour must have a description'],
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have a cover image'],
    },
    images: [String], //Because we want an array of string
    createdAt: {
        type: Date,
        default: Date.now(), //Current timestamp in milliseconds
        select: false //excludes the field fro being returned to users
    },
    startDates: [Date], //We want an array of dates
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        //GeoJSON, For Geo Spacial Data, Data that describes location on the earth with ongitude and attitude
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        //Array of numbers is expected  for the coordinates
        //It represents the coordinate point with longitude first followed by the latitude (reverse of the normal format)
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [ // Use an array to create an embedded document, so they can get their own id
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            //Array of numbers is expected  for the coordinates
            //It represents the coordinate point with longitude first followed by the latitude (reverse of the normal format)
            coordinates: [Number],
            address: String,
            description: String,
            day: Number, //The day to be visited out of the tour days
        }
    ],
    guides: [
        {
            type: mongoose.Schema.ObjectId,  //we expect the recieved type to be a mongodb id type
            ref: 'User', //What Model we are referencing
        }
    ]
}, {
    //to make virtual properties show up on object and JSON
    //Virtual Properties are Fields that are not saved in the database but calculated using other values
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

//Optimizing reading performance
//Using the fields the user might likely sort for or query the most
// Each Index uses indexes
// Each indexes will be updated each time records updates
// 1 = ascending -1 = descending, most times, it's not that important
tourSchema.index({ price: 1, ratingsAverage: -1 }); //compound index
tourSchema.index({ slug: 1 });
//For geoSpatial Query
tourSchema.index({ startLocation: '2dsphere' });

//Virtual properties like this can't be used in a query because they are not part of the database
tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7; //I didn't use arrow function because i want to have access to 'this' keyword
});

//Virtual populate for parent to children relationship
tourSchema.virtual('reviews', {
   ref: 'Review', // The model to be referenced
   foreignField: 'tour', // This is the name of the field on the other model (Review Model in this case) where the reference to this current model is stored
   localField: '_id' // Where the id is stored in this current model, i'e the field th foreign model is refrencing in this model
});

// DOCUMENT MIDDLEWARE(PRE): runs before .save() and .create() except .insertMany()
// They work like mutators in laravel


tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

//For embedding user guides to model
// tourSchema.pre('save', async function (next) {
//     const guidesPromises = this.guides.map(async id => await User.findById(id));
//     /*
//         The Promise.all() method takes an iterable of promises as an input,
//         and returns a single Promise that resolves to an array of the results
//         of the input promises. This returned promise will resolve when all of
//         the input's promises have resolved, or if the input iterable contains no promises.
//      */
//     this.guides = await Promise.all(guidesPromises);
// });
// tourSchema.pre('save', function (next) {
//     console.log('Will save document......');
//     next();
// });
//
// // DOCUMENT MIDDLEWARE(POST): runs after .save() and .create() except .insertMany()
// tourSchema.post('save', function (doc, next) {
//     console.log(doc);
//     next();
// });

//QUERY MIDDLEWARE
// tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) { //This fires whenever any query command with find is encountered
    this.find({ secretTour: {$ne: true} });

    this.start = Date.now();
    next();
});
tourSchema.pre(/^find/, function (next) { //This fires whenever any query command with find is encountered
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt' //These are the fields we don't want
    }); //We use populate to make it return the ref values
    next();
});

tourSchema.post(/^find/, function (docs, next) { //This fires whenever any query command with find is encountered
    console.info(`Query took ${Date.now() - this.start} milliseconds!`);

    console.log(docs);
    next();
});

//AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//     console.log(this.pipeline());
//     next();
// })


const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;