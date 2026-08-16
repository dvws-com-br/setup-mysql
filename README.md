# setup-mysql

GitHub Action that creates an isolated MySQL database for a CI job. The
database name is the `database-prefix` input plus a random 3-byte hex suffix.
As a post step, the action drops every database it created when the job
finishes.

## Usage

```yaml
steps:
  - uses: actions/checkout@v4

  - uses: dvws-com-br/setup-mysql@<version>
    with:
      host: 127.0.0.1
      port: 3306
      username: root
      password: root
      database-prefix: test_${{ github.run_id }}_${{ github.job }}__
      env-name: TEST_DB
```

Optionally, run MySQL as a service container in the same job:

```yaml
services:
  mysql:
    image: mysql:8.4
    env:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_ROOT_HOST: "%"
    ports:
      - 3306:3306
    options: >-
      --health-cmd "mysqladmin ping -h 127.0.0.1 -u root -proot"
      --health-interval 5s
      --health-timeout 5s
      --health-retries 20
```

## Inputs

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `host` | Database host | yes | |
| `port` | Database port | no | `3306` |
| `username` | Database username | yes | |
| `password` | Database password | yes | |
| `database-prefix` | Prefix for the created database | no | `test_` |
| `env-name` | Name of the environment variable receiving the database name | no | `DB_DATABASE` |

## Outputs

| Name | Description |
| --- | --- |
| `database` | Name of the created database |

The created database name is also exported as the environment variable named
by `env-name`.

## Cleanup

The post step saves the `database-prefix` used when the step ran and drops every
database matching that prefix on job completion. Databases are matched through
`information_schema.SCHEMATA`, so only databases with the exact saved prefix are
removed.

`CI_PREFIX_DB` is a pipeline concern and is not exported by this action. Define
it in your workflow when you need the prefix in later steps:

```yaml
env:
  CI_PREFIX_DB: test_${{ github.run_id }}_${{ github.job }}__
```

## Development

```bash
npm install
npm test
npm run lint
npm run build
```
