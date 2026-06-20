const { test } = require('@playwright/test');
const { Client } = require('pg');
require('dotenv').config();

test('Renovar key USDT de dolarvzla', async ({ page }) => {
    await page.goto('https://www.dolarvzla.com/settings/api');
    await page.waitForLoadState('networkidle');

    const botonGenerar = page.locator('text=GENERAR API KEY');
    const botonRenovar = page.locator('text=RENOVAR API KEY');

    if (await botonGenerar.isVisible().catch(() => false)) {
        await botonGenerar.click();
    } else {
        await botonRenovar.click();
    }

    await page.waitForTimeout(3000);

    const nuevaKey = await page.locator('input.css-11aywtz').nth(1).inputValue();

    if (!nuevaKey) {
        throw new Error('No se pudo capturar la nueva key');
    }

    console.log('Nueva key capturada:', nuevaKey);

    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    await client.query(
        "UPDATE config_api SET valor = $1, actualizado_en = NOW() WHERE nombre = 'usdt_api_key'",
        [nuevaKey]
    );
    await client.end();

    console.log('Key guardada en Supabase exitosamente');
});