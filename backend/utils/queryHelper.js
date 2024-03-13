const queryHelper = async (model, userQuery) => {
    const { filters, first, rows, sortField, sortOrder } = userQuery;

    let query = model.find();

    if (filters) {
    }

    if (first !== undefined && rows !== undefined) {
      query = query.skip(parseInt(first)).limit(parseInt(rows));
    }

    if (sortField && sortOrder) {
        const sortParams = {};
        sortParams[sortField] = parseInt(sortOrder);
        query = query.sort(sortParams);
    }

    const result = await query.exec();

    console.log(result)

    return result
}


module.exports = queryHelper