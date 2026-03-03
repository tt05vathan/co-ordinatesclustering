import { kv } from '@vercel/kv';
import XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function importExcel(filePath) {
    try {
        console.log(`Reading file: ${filePath}`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Found ${data.length} rows. Mapping data...`);

        const customers = data.map((row, index) => {
            // Prioritize string ID column if exists
            const id = row['ID'] || row['id'] || row['Customer ID'] || row['customer_id'];
            const name = row['customer_name'] || row['name'] || row['Name'] || `Customer ${index + 1}`;

            // Handle coordinates
            let lat = parseFloat(row['Latitude'] || row['lat'] || row['latitude']);
            let lng = parseFloat(row['Longitude'] || row['lng'] || row['longitude']);

            if (isNaN(lat) || isNaN(lng)) {
                lat = undefined;
                lng = undefined;
            }

            if (!id) {
                console.warn(`Skipping row ${index + 2}: Missing ID`);
                return null;
            }

            return { id: String(id), name, lat, lng };
        }).filter(Boolean);

        if (customers.length === 0) {
            console.error('No valid customer data found to import.');
            return;
        }

        console.log(`Uploading ${customers.length} customers to Vercel KV... (Cleaning existing data)`);

        // Overwrite the existing data per user request
        await kv.set('customers', customers);
        await kv.del('cluster_configs');

        console.log('✅ Clear and Import successful!');
        console.log(`${customers.filter(c => c.lat === undefined).length} customers were imported without coordinates.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during import:', error);
        process.exit(1);
    }
}

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node scripts/import_excel.mjs <path-to-excel-file>');
    process.exit(1);
}

importExcel(filePath);
