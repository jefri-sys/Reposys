require('dotenv').config();
const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

const INVENTORY_ITEMS = [
  {
    name: 'A4 Paper',
    category: 'Paper',
    unit: 'Sheets',
    currentStock: 5000,
    minimumThreshold: 500,
  },
  {
    name: 'A3 Paper',
    category: 'Paper',
    unit: 'Sheets',
    currentStock: 2000,
    minimumThreshold: 200,
  },
  {
    name: 'Legal Paper',
    category: 'Paper',
    unit: 'Sheets',
    currentStock: 1000,
    minimumThreshold: 100,
  },
  {
    name: 'Black Toner',
    category: 'Toner',
    unit: 'Percentage',
    currentStock: 80,
    minimumThreshold: 20,
  },
  {
    name: 'Cyan Toner',
    category: 'Toner',
    unit: 'Percentage',
    currentStock: 75,
    minimumThreshold: 20,
  },
  {
    name: 'Magenta Toner',
    category: 'Toner',
    unit: 'Percentage',
    currentStock: 70,
    minimumThreshold: 20,
  },
  {
    name: 'Yellow Toner',
    category: 'Toner',
    unit: 'Percentage',
    currentStock: 65,
    minimumThreshold: 20,
  },
  {
    name: 'Spiral Rolls',
    category: 'Binding',
    unit: 'Units',
    currentStock: 50,
    minimumThreshold: 10,
  },
  {
    name: 'Comb Strips',
    category: 'Binding',
    unit: 'Units',
    currentStock: 100,
    minimumThreshold: 20,
  },
  {
    name: 'Covers',
    category: 'Binding',
    unit: 'Units',
    currentStock: 200,
    minimumThreshold: 30,
  },
];

const seedInventory = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for inventory seeding');

    for (const item of INVENTORY_ITEMS) {
      await InventoryItem.updateOne(
        { name: item.name },
        {
          $setOnInsert: {
            ...item,
            usageRate: 0,
            daysOfStockRemaining: 0,
            lastUpdatedBy: null,
            lastUpdatedAt: null,
          },
        },
        { upsert: true }
      );
    }

    console.log(`Seeded ${INVENTORY_ITEMS.length} inventory items successfully`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding inventory:', error);
    process.exit(1);
  }
};

seedInventory();
