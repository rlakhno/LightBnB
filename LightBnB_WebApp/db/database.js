const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');


const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

// the following assumes that you named your connection variable `pool`
// pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {
//   console.log(response)
// });



/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  // let resolvedUser = null;
  // for (const userId in users) {
  //   const user = users[userId];
  //   if (user && user.email.toLowerCase() === email.toLowerCase()) {
  //     resolvedUser = user;
  //   }
  // }
  // return Promise.resolve(resolvedUser);

  return pool
  .query(`SELECT * FROM USERS WHERE email = $1;`, [email.toLowerCase()])
  .then((result) => {
    console.log(result.rows);
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  // return Promise.resolve(users[id]);
  return pool
  .query(`SELECT * FROM USERS WHERE id = $1;`, [id])
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });

};

/**
 * INSERT INTO users (
    name, email, password) 
    VALUES (
    'Devin Sanders', 'tristanjacobs@gmail.com', '$2a$10$FB/BOAVhpuLvpOREQVmvmezD4ED/.JBIDRh70tGevYzYzQgFId2u.');
    
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  // const userId = Object.keys(users).length + 1;
  // user.id = userId;
  // users[userId] = user;
  // return Promise.resolve(user);

  let array = [];
  array.push(user.name);
  array.push(user.email);
  array.push(user.password);

  return pool
  .query(`INSERT INTO users (
    name, email, password) 
    VALUES (
    $1, $2, $3) RETURNING *;`, array)
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });

};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {

  // return getAllProperties(null, 2);

  return pool
  .query(`SELECT reservations.id, properties.title, properties.cost_per_night, properties.cover_photo_url, properties.thumbnail_photo_url, properties.parking_spaces, properties.number_of_bathrooms, properties.number_of_bedrooms, reservations.start_date, avg(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.error(err.message);
      // Re-throwing the error for error handling further up the stack
      throw err; 
    })
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
// const getAllProperties = function (options, limit = 10) {
//   const limitedProperties = {};
//   for (let i = 1; i <= limit; i++) {
//     limitedProperties[i] = properties[i];
//   }
//   return Promise.resolve(limitedProperties);
// };


const getAllProperties = function (options, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, AVG(property_reviews.rating) AS average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
  `;

  // Filtering based on owner_id
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `WHERE properties.owner_id = $${queryParams.length} `;
  }

  // Filtering based on city
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    if (queryParams.length === 1) {
      queryString += `WHERE city LIKE $${queryParams.length} `;
    } else {
      queryString += `AND city LIKE $${queryParams.length} `;
    }
  }

  queryString += `
    GROUP BY properties.id
  `;
  const min_rating = parseInt(options.minimum_rating);
   // Grouping and filtering based on minimum rating
   if (options.minimum_rating) {
    if (queryParams.length === 0) {
      queryString += `HAVING AVG(property_reviews.rating) >= $1 `;
    } else {
      queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length + 1} `;
    }
    queryParams.push(min_rating);
  }
  // Filtering based on price range
if (options.minimum_price_per_night && options.maximum_price_per_night) {
  queryParams.push(options.minimum_price_per_night * 100); // converting to cents
  queryParams.push(options.maximum_price_per_night * 100); // converting to cents
  if (queryParams.length === 2) {
    queryString += `HAVING MIN(cost_per_night) >= $${queryParams.length - 1} AND MAX(cost_per_night) <= $${queryParams.length} `;
  } else {
    queryString += `AND MIN(cost_per_night) >= $${queryParams.length - 1} AND MAX(cost_per_night) <= $${queryParams.length} `;
  }
} else if (options.minimum_price_per_night) {
  queryParams.push(options.minimum_price_per_night * 100); // converting to cents
  if (queryParams.length === 1) {
    queryString += `HAVING MIN(cost_per_night) >= $${queryParams.length} `;
  } else {
    queryString += `AND MIN(cost_per_night) >= $${queryParams.length} `;
  }
} else if (options.maximum_price_per_night) {
  queryParams.push(options.maximum_price_per_night * 100); // converting to cents
  if (queryParams.length === 1) {
    queryString += `HAVING MAX(cost_per_night) <= $${queryParams.length} `;
  } else {
    queryString += `AND MAX(cost_per_night) <= $${queryParams.length} `;
  }
}

    // Ordering and limiting
    queryParams.push(limit);
    queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;
  // Logging and executing the query
  console.log(queryString, queryParams);
  return pool.query(queryString, queryParams).then((res) => res.rows);
};



/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
