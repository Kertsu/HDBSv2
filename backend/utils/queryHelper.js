const queryHelper = async (model, userQuery) => {
    const { filters, first, rows, sortField, sortOrder } = userQuery;

    let query = model.find();


    if (filters) {
      for (const [key, value] of Object.entries(JSON.parse(filters))) {
          if (value.value && value.matchMode === 'contains') {
              query = query.or([
                  { 'username': { $regex: new RegExp(value.value, 'i') } },
                  { 'email': { $regex: new RegExp(value.value, 'i') } }
              ]);
          } else if (value.value && value.matchMode === 'equals') {
              query = query.or([
                  { 'username': value.value },
                  { 'email': value.value }
              ]);
          }
      }
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

    const formattedResult = result.map(doc => {return {id: doc.id, ...doc._doc }})


    return formattedResult
}


module.exports = queryHelper