const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRouter');

const router = express.Router();

//Param middleware for checking url parameters
// router.param('id', (req, res, next, val) => tourController.checkID);


// POST /tour/234fad4/reviews
// GET /tour/234fad4/reviews
// GET /tour/234fad4/reviews/65545ddf
//Tell the tour router to use reviewRouter whenever it encounters a route
// that starts with /:tourId/reviews
router.use('/:tourId/reviews', reviewRouter);



router.route('/top-5-cheap')
    .get(tourController.aliasTopTours,  tourController.getAllTours);

router.route('/tour-stats').get(tourController.getToursStats);
router.route('/monthly-plan/:year').get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
);
router.route('/tours-within/:distance/center/:latlng/unit/:unit')
    .get(tourController.getToursWithin);
router.route('/distances/:latlng/unit/:unit')
    .get(tourController.getDistances)

router.route('/')
    .get(tourController.getAllTours)
    .post(authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.createTour);

router.route('/:id')
    .get(tourController.getTour)
    .patch(authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.updateTour)
    .delete(authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.deleteTour);


module.exports = router;
