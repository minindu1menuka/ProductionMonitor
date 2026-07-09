const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());


// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '*******', 
//   database: 'furniture_db' 
// });
// sdfdsdfffdg

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  } 
});

//get data from sku
app.get('/api/items/:sku', (req, res) => {
  const sku = req.params.sku;
  const sql = "SELECT * FROM items WHERE SKU = ?";
  db.query(sql, [sku], (err, results) => {
    if (err) return res.status(500).json(err);
    return res.json(results);
  });
});

//put
app.put('/api/items/:id', (req, res) => {
  const { SKU_Qty, Qty_Per_Unit, No_Of_Panels, SQM, Edge_Band_LM } = req.body;
  const id = req.params.id;
  
  const sql = "UPDATE items SET SKU_Qty = ?, Qty_Per_Unit = ?, No_Of_Panels = ?, SQM = ?, Edge_Band_LM = ? WHERE id = ?";
  
  db.query(sql, [SKU_Qty, Qty_Per_Unit, No_Of_Panels, SQM, Edge_Band_LM, id], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "sucessfully updated!" });
  });
});

//new item add
app.post('/api/items', (req, res) => {
  const { SKU, SKU_Qty, Item_No, Part_Name, Size_mm, Qty_Per_Unit, Edge_Band, L, W, T, Edge_Band_L, Edge_Band_W, No_Of_Panels, SQM, Edge_Band_LM, Machine } = req.body;
  
  const sql = "INSERT INTO items (SKU, SKU_Qty, Item_No, Part_Name, Size_mm, Qty_Per_Unit, Edge_Band, L, W, T, Edge_Band_L, Edge_Band_W, No_Of_Panels, SQM, Edge_Band_LM, Machine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [SKU, SKU_Qty, Item_No, Part_Name, Size_mm, Qty_Per_Unit, Edge_Band, L, W, T, Edge_Band_L, Edge_Band_W, No_Of_Panels, SQM, Edge_Band_LM, Machine], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "new Item added sucessfully", insertId: result.insertId });
  });
});

// get all part names using group by
app.get('/api/parts', (req, res) => {
  const sql = `
    SELECT 
      Part_Name, 
      MAX(Size_mm) as Size_mm, 
      MAX(Edge_Band) as Edge_Band, 
      MAX(L) as L, 
      MAX(W) as W, 
      MAX(T) as T, 
      MAX(Edge_Band_L) as Edge_Band_L, 
      MAX(Edge_Band_W) as Edge_Band_W, 
      MAX(Machine) as Machine 
    FROM items 
    WHERE Part_Name IS NOT NULL AND Part_Name != ''
    GROUP BY Part_Name
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    return res.json(results);
  });
});

// delete table row
app.delete('/api/items/:id', (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM items WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Item deleted successfully!" });
  });
});

// Delete an entire table 
app.delete('/api/items/sku/:sku', (req, res) => {
  const sku = req.params.sku;
  const sql = "DELETE FROM items WHERE SKU = ?";
  db.query(sql, [sku], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Entire SKU deleted successfully!" });
  });
});


// Get all production records
app.get('/api/production', (req, res) => {
  const sql = "SELECT * FROM production_records ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    // Convert keys from snake_case (DB) to camelCase (Frontend)
    const formattedResults = results.map(r => ({
      id: r.id,
      date: r.date,
      machineName: r.machine_name,
      availableTime: r.available_time,
      breakdownTime: r.breakdown_time,
      panelQuantity: r.panel_quantity,
      month: r.month
    }));
    return res.json(formattedResults);
  });
});

// Add new production record
app.post('/api/production', (req, res) => {
  const { date, machineName, availableTime, breakdownTime, panelQuantity, month } = req.body;
  const sql = "INSERT INTO production_records (date, machine_name, available_time, breakdown_time, panel_quantity, month) VALUES (?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [date, machineName, availableTime, breakdownTime, panelQuantity, month], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Record added successfully", id: result.insertId });
  });
});

// Update production record
app.put('/api/production/:id', (req, res) => {
  const id = req.params.id;
  const { date, machineName, availableTime, breakdownTime, panelQuantity, month } = req.body;
  
  const sql = "UPDATE production_records SET date=?, machine_name=?, available_time=?, breakdown_time=?, panel_quantity=?, month=? WHERE id=?";
  db.query(sql, [date, machineName, availableTime, breakdownTime, panelQuantity, month, id], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Record updated successfully" });
  });
});

// Delete production record
app.delete('/api/production/:id', (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM production_records WHERE id=?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Record deleted successfully" });
  });
});


// Get all breakdown records
app.get('/api/breakdowns', (req, res) => {
  const sql = "SELECT * FROM breakdown_records ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    const formatted = results.map(r => ({
      id: r.id,
      year: r.year,
      month: r.month,
      day: r.day,
      date: r.date,
      machineName: r.machine_name,
      lossDuration: r.loss_duration,
      reason: r.reason
    }));
    return res.json(formatted);
  });
});

// Add new breakdown record
app.post('/api/breakdowns', (req, res) => {
  const { year, month, day, date, machineName, lossDuration, reason } = req.body;
  const sql = "INSERT INTO breakdown_records (year, month, day, date, machine_name, loss_duration, reason) VALUES (?, ?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [year, month, day, date, machineName, lossDuration, reason || ''], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Breakdown added successfully", id: result.insertId });
  });
});

// Delete all breakdowns for a specific date (This is for the inline day-editing feature)
app.delete('/api/breakdowns/day/:date', (req, res) => {
  const date = req.params.date;
  const sql = "DELETE FROM breakdown_records WHERE date = ?";
  db.query(sql, [date], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "Day breakdowns deleted successfully" });
  });
});

// Delete ALL production records for a specific date
app.delete('/api/production/day/:date', (req, res) => {
  const date = req.params.date;
  const sql = "DELETE FROM production_records WHERE date = ?";
  db.query(sql, [date], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json({ message: "All production records for the day deleted successfully" });
  });
});

// Wipe entire Database (Factory Reset)
app.delete('/api/wipe', (req, res) => {
  const sqlProd = "TRUNCATE TABLE production_records";
  const sqlBrk = "TRUNCATE TABLE breakdown_records";
  
  
  db.query(sqlProd, (err1) => {
    if (err1) return res.status(500).json(err1);
    db.query(sqlBrk, (err2) => {
      if (err2) return res.status(500).json(err2);
      return res.json({ message: "Database wiped completely" });
    });
  });
});

//login auth
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const sql = "SELECT * FROM admin WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    
    if (results.length > 0) {
      return res.json({ success: true, message: "Login successful!" });
    } else {
      return res.status(401).json({ success: false, message: "Invalid Username or Password!" });
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});