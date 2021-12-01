const Tour = require('./../models/tourModel');
// const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');


//ROUTE HANDLERS
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage, price';
    req.query.fields = 'name, price, ratingsAverage,summary,difficulty';
    next();
}

exports.getToursStats = catchAsync(async (req, res, next) => {
        const stats = await Tour.aggregate([
            {
                $match: { ratingAverage: { $gte: 4.5 } }
            },
            {
                $group: {
                    _id: { $toUpper: '$difficulty' },
                    numTours: { $sum: 1 },
                    numRatings: { $sum: '$ratingQuantity' },
                    avgRating: { $avg: '$ratingAverage' },
                    avgPrice: { $avg: '$price' },
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' }
                }
            },
            {
                $sort: { avgPrice: 1 },
            },
            // {
            //     $match: { _id: { $ne: 'Easy' } }
            // }
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                stats
            }
        });
 });

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
        const year = req.params.year * 1; //The * 1 converts it to an integer
        const plan = await Tour.aggregate([
            {
                $unwind: '$startDates'
            },
            {
                $match: {
                    $startDates: {
                        $gte: new Date(`${year}-01-01`),
                        $lte: new Date(`${year}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: 'startDates' },
                    numTours: { $sum: 1 },
                    tours: { $push: '$name' }
                }
            },
            {
                $addFields: { $month: '$_id' }
            },
            {
                $project: {
                    _id: 0, //value 0 means hidden
                }
            },
            {
                $sort: { numToursStats: -1 } //-1 means descending order
            },
            {
                $limit: 12
            }

        ]);

        res.status(200).json({
            status: 'success',
            data: {
                plan
            }
        });
 });

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/24.11175, -118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [ lat, lng ] = latlng.split(',');

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng){
        next(
          new  AppError('Please provide latitude and longitude in the formate lat,lng.',
              400
              )
        );
    }
    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [ [lng, lat], radius ]  } }
    });

    res.status(200).json({
       status: "success",
       results: tours.length,
        data: {
           data: tours
        }
    });

});

exports.getDistances = catchAsync( async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [ lat, lng ] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.000621371: 0.001;

    if (!lat || !lng){
        next(
            new  AppError('Please provide latitude and longitude in the formate lat,lng.',
                400
            )
        );
    }

    const  distances = await Tour.aggregate([
        // geoNear should always be the first stage in aggregation pipeline
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name
            }
        }
    ]);

    res.status(200).json({
        status: "success",
        data: {
            data: distances
        }
    });

});

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.createTour = factory.createOne(Tour);

