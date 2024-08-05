const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const port = 3006;

app.use(cors());
app.use(express.json());

const excelDir = path.join(__dirname, "excel");

if (!fs.existsSync(excelDir)) {
  fs.mkdirSync(excelDir);
}

const { spawn } = require("child_process"); // Assuming you use a child process for conversion

printServiceRouter.post("/ConvertToPDF/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(excelDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }

  // Placeholder for your conversion logic
  const pdfFilename = filename.replace(/\.xlsx$/, ".pdf");
  const pdfPath = path.join(excelDir, pdfFilename);

  // Assuming a hypothetical convertToPDF function that handles the conversion
  convertToPDF(filePath, pdfPath, (err) => {
    if (err) {
      console.error(`Error converting file to PDF: ${err}`);
      return res.status(500).send("Error converting file to PDF.");
    }

    res.status(200).json({ pdfUrl: `/excel/${pdfFilename}` });
  });
});

function convertToPDF(inputPath, outputPath, callback) {
  // Example conversion using a command line tool (e.g., libreoffice)
  const convertProcess = spawn("libreoffice", [
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    path.dirname(outputPath),
    inputPath,
  ]);

  convertProcess.on("close", (code) => {
    if (code === 0) {
      callback(null);
    } else {
      callback(new Error(`Conversion process exited with code ${code}`));
    }
  });
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, excelDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

const printServiceRouter = express.Router();

printServiceRouter.post("/", upload.single("xlsx"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  const xlsxUrl = `/excel/${req.file.filename}`;
  res.status(201).json({ xlsxUrl });
});

printServiceRouter.get("/:filename", (req, res) => {
  const filePath = path.join(excelDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found.");
  }
});

printServiceRouter.delete("/:filename", (req, res) => {
  const filePath = path.join(excelDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.status(204).send();
  } else {
    res.status(404).send("File not found.");
  }
});

printServiceRouter.post("/Print/:filename", (req, res) => {
  const filePath = path.join(excelDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return res.status(404).send("File not found.");
  }

  exec(`lp "${filePath}"`, (err) => {
    if (err) {
      console.error(`Error printing file: ${err}`);
      return res.status(500).send("Error printing file.");
    }
    res.status(200).send("File sent to printer.");
  });
});

printServiceRouter.post("/Print", (req, res) => {
  const { table, data } = req.body;
  const dbPath = path.join(__dirname, "db.json");

  fs.readFile(dbPath, "utf8", (err, fileData) => {
    if (err) {
      console.error(`Error reading database file: ${err}`);
      return res.status(500).send("Error reading database file.");
    }

    const db = JSON.parse(fileData);

    if (!db[table]) {
      db[table] = [];
    }

    db[table].push(data);

    fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf8", (err) => {
      if (err) {
        console.error(`Error writing to database file: ${err}`);
        return res.status(500).send("Error writing to database file.");
      }
      res.status(201).send("Data stored in database.");
    });
  });
});

app.use("/excel", express.static(path.join(__dirname, "excel")));
app.use("/print-service", printServiceRouter);

app.listen(port, () => {
  console.log(`Print service running on port ${port}`);
});