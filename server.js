const express = require("express");
const fs = require('fs');
// const {open} = require("sqlite");
const mysql = require("mysql2/promise")
// const sqlite3 = require("sqlite3")
const bodyParser = require("body-parser");
const cors = require("cors");

require("dotenv").config();

const app= express();

const port = process.env.PORT || 5000;


app.use(cors());
app.use(bodyParser.json());

const pool = mysql.createPool({
    host:process.env.DB_HOST,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME,
    port:process.env.DB_PORT,
    ssl: {
        ca: process.env.CA_CERT,
        rejectUnauthorized:true
        // ca: Buffer.from(process.env.CA_CERT, 'base64').toString('utf-8'),
        // rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// let db;

// try{
    //     db= await open({
    //         filename:"contact.db",
    //         driver:sqlite3.Database
    //     })

    //     // Create Table if Not Exists
    //     await db.exec(`
    //         CREATE TABLE IF NOT EXISTS contacts (
    //             id INTEGER PRIMARY KEY AUTOINCREMENT,
    //             name TEXT NOT NULL,
    //             email TEXT NOT NULL,
    //             number TEXT NOT NULL,
    //             message TEXT NOT NULL,
    //             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //         );
    //     `);


    //     app.listen(port, () => {
    //         console.log(`Server running on http://localhost:${port}`);
    //     });
    // }

const initializeDBAndServer= async () =>{
    try{
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                number VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        connection.release();

        app.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    }
    catch (e) {
        console.error(`Server Error: ${e.message}`);
        process.exit(1);
    }
}

app.get("/form",async (req,res)=>{
    let connection;
    try {
        connection=await pool.getConnection();
        const [details]=await connection.query("SELECT * FROM contacts;");
        res.send(details);
    }catch(e){
        console.log("Error is:",e)
    } finally {
        if (connection) connection.release();
    }
})

app.post("/submit-form", async(req,res)=>{
    const {name,email,number,message}=req.body;

    if (!name || !email || !number || !message) {
        return res.status(400).json({error:"All Fields are required"});
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.execute(
            "INSERT INTO contacts (name, email, number, message) VALUES (?, ?, ?, ?)", 
            [name, email, number, message]
        );
        console.log("Received form data:", { name, email, number, message });
        res.json({ message: "Form submitted successfully!" });
    } catch (e) {
        console.error("Error saving the data:", e.stack);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        if (connection) connection.release();
    }
})


initializeDBAndServer();
