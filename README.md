# node etl stream

Proof of Concept to test ETL processes via Node streams and/or
async iterators

## Sample ETL Process

Extract:
    Read primarily from a Postgres table

Transform:
    Read additional data from a GraphQL API and agument data stram

Load:
    Batch write results into a DynamoDB table

## Getting Started

```bash
# get the code
# please note the use of git submodules!
git checkout https://github.com/krcourville/node-etl-stream.git --recurse-submodules

# install node modules
npm install

# in a dedicated terminal, start postgres and dynamodb local
docker-compose up

# configure the DynamoDb table
npm run cli -- create-movie-actors-table

# in another terminal, run the web server
npm run serve

# run the migration
npm run cli -- migrate

```
