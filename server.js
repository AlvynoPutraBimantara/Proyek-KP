const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Welcome to my server!");
});

const dbFilePath = path.join(__dirname, "db.json");
const uploadsDir = path.join(__dirname, "uploads");
const imagesDir = path.join(__dirname, "images");


if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

const getData = () => {
  if (!fs.existsSync(dbFilePath)) {
    const initialData = {
      SuratMasuk: [],
      Orders: [],
      Cart: [],
      Transactions: [],
      User: [],
      DataProduk: [],
      DataKategori: [],
      RiwayatTransaksi: [],
    };
    fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
};

const saveData = (data) =>
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2));

const formatDateString = (dateString) => {
  const [day, month, year] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

app.use("/uploads", express.static(uploadsDir));
app.use("/images", express.static(imagesDir));



app.post("/uploads", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  const pdfUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({ pdfUrl });
});

app.post("/images", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  const imageUrl = `/images/${req.file.filename}`;
  res.status(201).json({ imageUrl });
});

app.get("/User", (req, res) => {
  const data = getData();
  res.json(data.User);
});

app.get("/User/:id", (req, res) => {
  const data = getData();
  const user = data.User.find((u) => u.id === parseInt(req.params.id));
  if (user) {
    res.json(user);
  } else {
    res.status(404).send("User not found");
  }
});

app.put("/User/:id", (req, res) => {
  const data = getData();
  const userIndex = data.User.findIndex((u) => u.id === parseInt(req.params.id));
  if (userIndex !== -1) {
    data.User[userIndex] = req.body;
    saveData(data);
    res.status(200).json(data.User[userIndex]);
  } else {
    res.status(404).send("User not found");
  }
});

app.get("/SuratMasuk", (req, res) => {
  const data = getData();
  res.json(data.SuratMasuk);
});

app.post("/SuratMasuk", (req, res) => {
  const data = getData();
  const newProduct = req.body;
  newProduct.id = data.SuratMasuk.length ? data.SuratMasuk[data.SuratMasuk.length - 1].id + 1 : 1;


  newProduct.tanggalSurat = formatDateString(newProduct.tanggalSurat);
  newProduct.diterimaTanggal = formatDateString(newProduct.diterimaTanggal);
  newProduct.tanggalDisposisi = formatDateString(newProduct.tanggalDisposisi);

  data.SuratMasuk.push(newProduct);
  saveData(data);
  res.status(201).json(newProduct);
});

app.put("/SuratMasuk/:id", (req, res) => {
  const data = getData();
  const productId = parseInt(req.params.id);
  const updatedProduct = req.body;
  const productIndex = data.SuratMasuk.findIndex((p) => p.id === productId);
  if (productIndex !== -1) {
    data.SuratMasuk[productIndex] = updatedProduct;
    saveData(data);
    res.status(200).json(updatedProduct);
  } else {
    res.status(404).send("Product not found");
  }
});

app.get("/Orders", (req, res) => {
  const data = getData();
  res.json(data.Orders);
});

app.post("/Orders", (req, res) => {
  const data = getData();
  const newOrder = req.body;
  newOrder.timestamp = new Date().toISOString();
  data.Orders.push(newOrder);
  saveData(data);
  res.status(201).json(newOrder);
});

app.delete("/Orders/:id", (req, res) => {
  const data = getData();
  const orderId = parseInt(req.params.id);
  const orderIndex = data.Orders.findIndex((order) => order.id === orderId);
  if (orderIndex !== -1) {
    data.Orders.splice(orderIndex, 1);
    saveData(data);
    res.status(204).end();
  } else {
    res.status(404).send("Order not found");
  }
});

app.get("/Cart", (req, res) => {
  const data = getData();
  res.json(data.Cart);
});

app.post("/Cart", (req, res) => {
  const data = getData();
  const newCartItem = req.body;
  data.Cart.push(newCartItem);
  saveData(data);
  res.status(201).json(newCartItem);
});

app.delete("/Cart/:id", (req, res) => {
  const data = getData();
  const cartItemId = parseInt(req.params.id);
  data.Cart = data.Cart.filter((item) => item.id !== cartItemId);
  saveData(data);
  res.status(204).end();
});

app.delete("/Cart", (req, res) => {
  const data = getData();
  data.Cart = [];
  saveData(data);
  res.status(204).end();
});

app.get("/Transactions", (req, res) => {
  const data = getData();
  const transactions = data.Transactions;
  const products = data.DataProduk;
  const namaWarung = req.headers["nama-warung"];
  if (!namaWarung) {
    return res.status(400).send("NamaWarung header is missing");
  }
  const transactionsWithPedagang = transactions.map((transaction) => {
    const itemsWithPedagang = transaction.items.map((item) => {
      const product = products.find((p) => p.id === item.id);
      return {
        ...item,
        pedagang: product ? product.Pedagang : null,
      };
    });
    return {
      ...transaction,
      items: itemsWithPedagang,
    };
  });
  const filteredTransactions = transactionsWithPedagang.filter((transaction) =>
    transaction.items.some((item) => item.pedagang === namaWarung)
  );
  res.json(filteredTransactions);
});

app.post("/Transactions", (req, res) => {
  const data = getData();
  const newTransaction = req.body;
  newTransaction.timestamp = new Date().toISOString();
  console.log(`Transaction by user ${newTransaction.user} is being processed`);
  data.Transactions.push(newTransaction);
  saveData(data);
  res.status(201).json(newTransaction);
});

app.delete("/Transactions/:id", (req, res) => {
  const data = getData();
  const transactionId = parseInt(req.params.id);
  const transactionIndex = data.Transactions.findIndex(
    (transaction) => transaction.id === transactionId
  );
  if (transactionIndex !== -1) {
    data.Transactions.splice(transactionIndex, 1);
    saveData(data);
    res.status(204).end();
  } else {
    res.status(404).send("Transaction not found");
  }
});

app.put("/DataKategori/:id", (req, res) => {
  const data = getData();
  const kategoriId = parseInt(req.params.id);
  const updatedKategori = req.body;
  const kategoriIndex = data.DataKategori.findIndex((k) => k.id === kategoriId);
  if (kategoriIndex !== -1) {
    data.DataKategori[kategoriIndex] = {
      ...data.DataKategori[kategoriIndex],
      ...updatedKategori,
    };
    saveData(data);
    res.status(200).json(updatedKategori);
  } else {
    res.status(404).send("Kategori not found");
  }
});

app.get("/RiwayatTransaksi", (req, res) => {
  const data = getData();
  res.json(data.RiwayatTransaksi);
});

app.post("/RiwayatTransaksi", (req, res) => {
  const data = getData();
  const newTransaction = req.body;
  newTransaction.timestamp = new Date().toISOString();
  data.RiwayatTransaksi.push(newTransaction);
  saveData(data);
  res.status(201).json(newTransaction);
});

app.delete("/RiwayatTransaksi/:id", (req, res) => {
  const data = getData();
  const transactionId = parseInt(req.params.id);
  const transactionIndex = data.RiwayatTransaksi.findIndex(
    (transaction) => transaction.id === transactionId
  );
  if (transactionIndex !== -1) {
    data.RiwayatTransaksi.splice(transactionIndex, 1);
    saveData(data);
    res.status(204).send();
  } else {
    res.status(404).send("Transaction not found");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
