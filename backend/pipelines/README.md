# How to deploy RAIDEN AI pipelines

Pipelines are cloud-managed automation deployments.

They can be created as follows:

```
curl --request POST \
  --url https://api.raiden.ai/actions/pipeline/create \
  --header 'Content-Type: application/json' \
  --header 'key: YOUR_RAIDEN_AI_KEY' \
  --data '
{
  "name": "analyze-source",
  "description": "Analyze the arguments & counter arguments of a source",
  "public": false,
  "definition": "__REPLACE_DEFINITION_STRING_HERE__",
  "schema": {QUERY_SCHEMA_OBJECT_HERE},
  "example": {QUERY_EXAMPLE_OBJECT_HERE}
}
'
```
