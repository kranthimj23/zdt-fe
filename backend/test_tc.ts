import { PostgreSqlContainer } from '@testcontainers/postgresql';

async function test() {
    const container = await new PostgreSqlContainer('postgres:16-alpine').start();
    console.log('Container started');
    console.log('Methods:', Object.keys(container));
    console.log('Proto Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(container)));

    // Try building manually if getConnectionString is missing
    const host = container.getHost();
    const port = container.getMappedPort(5432);
    const user = container.getUsername();
    const pass = container.getPassword();
    const db = container.getDatabase();

    console.log(`postgresql://${user}:${pass}@${host}:${port}/${db}`);

    await container.stop();
}

test().catch(console.error);
