const cors = require('micro-cors')(); // highlight-line
const { ApolloServer, gql } = require('apollo-server-micro');
const { send } = require('micro');
const { MultiMatchQuery, SearchkitSchema, RefinementSelectFacet } = require('@searchkit/schema');

const searchkitConfig = {
  host: 'http://elastic:changeme@localhost:9200/',
  index: 'pokemon',
  hits: {
    fields: []
  },
  query: new MultiMatchQuery({ fields: ['name'] }),
  facets: [
    new RefinementSelectFacet({ field: 'types.keyword', identifier: 'types', label: 'Type' }),
    new RefinementSelectFacet({ field: 'legendary', identifier: 'legendary', label: 'Legendary' }),
  ],
  sortOptions: [
    { id: 'relevance', label: 'Relevance', field: '_score' },
    { id: 'sp_attack', label: 'Sp. Attack', field: 'sp_attack' },
  ],
  postProcessRequest: (body) => {
    console.log(JSON.stringify(body, null, 2));
    return body;
  }
}

// Returns SDL + Resolvers for searchkit, based on the Searchkit config
const { typeDefs, withSearchkitResolvers, context } = SearchkitSchema({
  config: searchkitConfig, // searchkit configuration
  typeName: 'ResultSet', // type name for Searchkit Root
  hitTypeName: 'ResultHit', // type name for each search result
  addToQueryType: true // When true, adds a field called results to Query type 
})


const config = {
  api: {
    bodyParser: false
  }
}

const server = new ApolloServer({
  typeDefs: [
    gql`
    type Query {
      root: String
    }

    type HitFields {
      name: String
      root: String
      number: String
      total: Int
      hp: Int
      attack: Int
      defenese: Int
      sp_attack: Int
      sp_def: Int
      speed: Int
      generation: Int
      legendary: String
      image: String
      url: String
      id: String
    }

    # Type name should match the hit typename
    type ResultHit implements SKHit {
      id: ID!
      fields: HitFields
    }
  `, ...typeDefs
  ],
  resolvers: withSearchkitResolvers({}),
  introspection: true,
  playground: true,
  context: {
    ...context
  }
});

module.exports = server.start().then(() => {
  const handler = server.createHandler({ path: '/api/graphql' })
  return cors((req, res) => req.method === 'OPTIONS' ? send(res, 200, 'ok') : handler(req, res))
});