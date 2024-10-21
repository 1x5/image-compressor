const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const OUTPUT_DIR = path.join(__dirname, 'compressed');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

app.use(express.static('public'));

app.post('/compress', upload.array('images'), async (req, res) => {
  try {
    const compressedFiles = [];

    // Сжатие изображений
    for (const file of req.files) {
      const outputFileName = `compressed_${Date.now()}_${file.originalname}`;
      const outputFilePath = path.join(OUTPUT_DIR, outputFileName);

      await sharp(file.buffer)
        .jpeg({ quality: 70 })
        .toFile(outputFilePath);

      compressedFiles.push(outputFilePath); // сохраняем путь к файлу для архивации
    }

    // Если загружено больше одного файла, создаем ZIP-архив
    if (req.files.length > 1) {
      const zipFilePath = path.join(OUTPUT_DIR, `compressed_images_${Date.now()}.zip`);
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip');

      output.on('close', () => {
        console.log(`ZIP-архив создан: ${zipFilePath}`);
        res.json({ zipUrl: `/compressed/${path.basename(zipFilePath)}` });
      });

      archive.on('error', (err) => {
        throw err;
      });

      archive.pipe(output);

      // Добавляем сжатые изображения в архив
      compressedFiles.forEach(file => {
        archive.file(file, { name: path.basename(file) });
      });

      archive.finalize();
    } else {
      res.status(400).send('Загрузите более одного изображения для создания ZIP-архива.');
    }
  } catch (error) {
    console.error('Ошибка сжатия:', error);
    res.status(500).send('Ошибка сжатия изображений.');
  }
});

// Делаем архивы доступными для скачивания
app.use('/compressed', express.static(OUTPUT_DIR));

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
