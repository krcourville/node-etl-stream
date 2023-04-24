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
# in a dedicated terminal
cd pagilla && docker-compose up
```
