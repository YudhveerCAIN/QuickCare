const paginateResults = (model) => {
  return async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;

    try {
      const results = await model.find()
        .limit(limit)
        .skip(skipIndex)
        .exec();

      const total = await model.countDocuments();
      const totalPages = Math.ceil(total / limit);

      res.paginatedResults = {
        results,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };

      next();
    } catch (error) {
      res.status(500).json({ message: 'Error occurred while paginating' });
    }
  };
};

module.exports = { paginateResults };
