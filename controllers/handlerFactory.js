const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require("../utils/apiFeatures");

exports.deleteOne = Model => catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if(!doc){
        return next(new AppError('No document found with that ID', 404))
    }

    res.status(204).json({ //204 means no data
        status: 'success',
        data: null
    });
});

exports.updateOne = Model => catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true, //To return the updated version of the document
        runValidators: true // To validate inputs based on the Tour schema
    });

    if (!doc){
        return next(new AppError('No document found with that id', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            data: doc
        }
    });
});

exports.createOne = Model => catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
        status: 'success',
        data: {
            tour: doc
        }
    });
});

exports.getOne = (Model, popOptions) => catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions); //We use populate to make it return the ref values

    const doc  = await query;
    // Tour.findOne({ _id: req.params.id });

    if(!doc){
        return next(new AppError('No document found with that ID', 404))
    }

    res.status(200).json({
        status: 'success',
        data: {
            data: doc,
        }
    })
});

exports.getAll = Model => catchAsync(async (req, res, next) => {

    // To allow for nested GET reviews on tour(hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId};

    //BUILD THE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    //EXECUTE THE QUERY
    const docs = await features.query;
    // const tours = await Tour.find;

    //SEND RESPONSE
    res.status(200).json({
        status: 'success',
        results: docs.length,
        data: {
            data: docs,
        }
    });

});