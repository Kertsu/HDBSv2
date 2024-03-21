const queryHelper = async (model, userQuery, type) => {
    const { filters, first, rows, sortField, sortOrder, area, mode } = userQuery;

    let query = model.find();


    if (filters && type=='user' ) {
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
  } else if (filters && type=='hotdesk'){
    for (const [key, value] of Object.entries(JSON.parse(filters))) {
        console.log(typeof value.value)
        if (value.value && value.matchMode === 'contains') {
            query = query.or([
                { 'deskNumber': { $regex: new RegExp(value.value, 'i') } },
            ]);
        } else if (value.value && value.matchMode === 'equals') {
            query = query.or([
                { 'deskNumber': parseInt(value.value) },
            ]);
        }
    }
  } else if(mode && type=='reservation'){
    query = query.find({mode})
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