const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const serveIndex = require('serve-index'); // To enable directory listing

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'secret123'; // secure password

// Ensure 'uploads' folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Function to get current date in 'YYYY-MM-DD' format
function getCurrentDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Multer storage config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dateFolder = getCurrentDate(); // Get the current date
    const uploadPath = path.join(uploadDir, dateFolder);

    // Create the directory for today's date if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath); // Set the destination for the upload
  },
  filename: (req, file, cb) => {
    // Format: YYYYMMDD_ORIGINALNAME.ext
    const dateStr = getCurrentDate().replace(/-/g, ''); // Remove dashes
    const originalName = path.basename(file.originalname, path.extname(file.originalname));
    const extension = path.extname(file.originalname);
    cb(null, `${dateStr}_${originalName}${extension}`);
  }
});
const upload = multer({ storage });

// Middleware to serve static files and parse form data
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle form submission with file upload
app.post('/submit', upload.array('files'), async (req, res) => {
  try {
    const { name, phone, size, colors, comments, email } = req.body;
    const uploadedFiles = req.files.map(file => file.filename);
    const fileDownloadLinks = uploadedFiles.map(file =>
      `http://localhost:3000/uploads/${getCurrentDate()}/${file}` // Change the domain if deployed.
    ).join('\n');

    // Nodemailer config
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'tanjiro1398@gmail.com',
        pass: 'otha lvju gfmq ciwd' // Gmail App Password
      }
    });

    const mailOptions = {
      from: 'tanjiro1398@gmail.com', // Must match the Gmail account being used
      to: 'tanjiro1398@gmail.com',   // Can be changed or additional recipients can be added here
      replyTo: email,                // When replied to, the response will go to the customer's email
      subject: '📥 New Print Order',
      text: `
🖨️ New print order received:

📏 Size: ${size}
🎨 Color: ${colors}
💬 Comments: ${comments}
📧 Customer Email: ${email}
🌸 Name: ${name}
📱 Phone No.: ${phone}
📎 Files: ${fileDownloadLinks}
      `
    };

    await transporter.sendMail(mailOptions);
    // Instead of sending plain text, redirect to confirmation page
    res.redirect('/confirmation.html');
  } catch (error) {
    console.error('❌ Email send error:', error);
    res.status(500).send('❌ Something went wrong while submitting your order.');
  }
});

// 🔒 Protect the '/uploads' route using Basic Auth.
// If there are no credentials or the credentials are incorrect, we will send a 'WWW-Authenticate' header
app.use('/uploads', (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('🔒 Unauthorized: Admins only');
  }
  
  // Parse the credentials from header
  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('🔒 Unauthorized: Admins only');
  }
}, express.static(uploadDir), serveIndex(uploadDir, { 'icons': true }));

// ▶️ Start server on 0.0.0.0 for public access when hosted
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
