class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter (){
        const queryObj = {...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        // 1B) Advanced filtering
        let queryStr = JSON.stringify(queryObj); //converts object to string
        //Replace the improperly formed filtering keyword with it's proper form e.g replace lte: 5 with $lte: 5
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr))
        return this; //Means to return the entire object
    }

    sort () {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' '); //replaces ',' with space in the sorting string
            this.query = this.query.sort(sortBy);
        }else {
            this.query = this.query.sort('-createdtAt'); // Sort based on the creation date in descending order, newest first
        }
        return this; //Means to return the entire object
    }

    limitFields () {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join('  ');
            this.query = this.query.select(fields);
        }else {
            this.query = this.query.select('-__v'); // The - sign means excluding the field, in our case __v fields that was added by mongoose
        }

        return this; //Means to return the entire object
    }

    paginate() {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        return this;  //Means to return the entire object
    }
}
module.exports = APIFeatures;