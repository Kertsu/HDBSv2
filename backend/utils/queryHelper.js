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

    const formattedResult = result.map(doc => {return {id: doc.id, ...doc._doc }})


    return formattedResult
}


module.exports = queryHelper