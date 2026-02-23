const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
require('dotenv').config();

async function test() {
    try {
        const prisma = new PrismaClient();
        await prisma.$connect();
        fs.writeFileSync('prisma-error.log', 'SUCCESS');
    } catch (e) {
        fs.writeFileSync('prisma-error.log', JSON.stringify(e, null, 2) + '\n' + e.message + '\n' + e.stack);
    }
}

test();
