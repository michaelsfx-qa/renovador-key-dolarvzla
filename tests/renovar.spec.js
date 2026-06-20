const { test } = require('@playwright/test');
const { Client } = require('pg');
require('dotenv').config();

test('Renovar key USDT de dolarvzla', async ({ page }) => {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    const resultado = await client.query(
        "SELECT actualizado_en FROM config_api WHERE nombre = 'usdt_api_key'"
    );

    const ultimaActualizacion = resultado.rows[0]?.actualizado_en;
    const horasTranscurridas = ultimaActualizacion
        ? (Date.now() - new Date(ultimaActualizacion).getTime()) / (1000 * 60 * 60)
        : Infinity;

    console.log(`Horas transcurridas desde la última renovación: ${horasTranscurridas.toFixed(1)}`);

    if (horasTranscurridas < 60) {
        console.log('Aún no han pasado 60 horas. No se renueva la key.');
        await client.end();
        return;
    }

    console.log('Han pasado 60 horas o más. Generando nueva key...');

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
        await client.end();
        throw new Error('No se pudo capturar la nueva key');
    }

    console.log('Nueva key capturada:', nuevaKey);

    await client.query(
        "UPDATE config_api SET valor = $1, actualizado_en = NOW() WHERE nombre = 'usdt_api_key'",
        [nuevaKey]
    );

    await client.end();

    console.log('Key guardada en Supabase exitosamente');
});