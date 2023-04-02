start:

```
SERVER_HOSTNAME=example.com yarn start
```

deploy:

```
flyctl volumes create data --region lax --size 3 # first time only
flyctl deploy
```