# MastoFeeder
> RSS to ActivityPub proxy

This is a simple Mastodon/ActivityPub server that has a virtual
`@website@mastofeeder.com` user for every RSS feed in the Internet. Just search
for your favourite RSS-enabled website from Mastodon's search and follow the
user! All RSS items will be posted as toots.

## Examples:

- `@xkcd.com@mastofeeder.com`
- `@theverge.com@mastofeeder.com`
- `@engadget.com@mastofeeder.com`
- `@techcrunch.com@mastofeeder.com`
- Or any other website that has an RSS feed! `@YOUR_WEBSITE_HERE@mastofeeder.com`
- Convert slashes to dots: `indiegames.com/blog` -> `@indiegames.com.blog@mastofeeder.com`

## Developing

You can run the project locally:

```shell
yarn
SERVER_HOSTNAME=your-domain.com yarn dev
```

This runs the project using `ts-node`. Note that you need to have a public DNS
for the project to work; you can use e.g. [ngrok](https://ngrok.com/) or
[localhost.run](https://localhost.run/) for this.

### Building

Running the project in dev mode is not recommended for production, as it takes a
lot more memory and yields in longer startup time. You can run the project in
produciton mode by building it first:

```shell
yarn build
yart start
```

This compiles the project to `build/` folder using `tsc` and runs the built app.

### Deploying

This project is deployed automatically when pushed to `master` branch using
[gh-actions](./.github/workflows/fly.yml).

## Features

This project tries to achieve:
* Following any RSS feed directly from Mastodon
* No login, no registration, no ads
* Being a super simple ActivityPub server

## Configuration

This project uses environment variables for configuration. The following
environment variables are available:

#### SERVER_HOSTNAME
Required: `true`

Needed so that the server knows what domain it's running on.

#### DATABASE_FILENAME
Default: `./database.db`

This project uses SQLite as a database; it's the simplest sane option for
single-server fly.io persistence. You can specify the filename of the database
here.

## Contributing

If you'd like to contribute, please fork the repository and use a feature
branch. Pull requests are warmly welcome.

## Licensing

The code in this project is licensed under MIT license.
