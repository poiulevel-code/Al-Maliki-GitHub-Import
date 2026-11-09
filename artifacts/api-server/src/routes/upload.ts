import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { adminOnly, store } from "./store.js";
import { downloadStorageObject, uploadImageToSupabase, uploadLogoToSupabase } from "../lib/db.js";
import { dbSetSetting } from "../lib/db.js";
import { hasSupabase } from "../lib/supabase.js";

const memStorage = multer.memoryStorage();
const upload = multer({
  storage: memStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: (_req, file, cb) => {
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

const LOCAL_IMAGES_DIR = path.resolve(process.cwd(), "public/images");

function detectedImageExtension(buffer: Buffer): ".jpg" | ".png" | ".webp" | null {
  if (buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return ".png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }
  if (buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP") {
    return ".webp";
  }
  return null;
}

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_IMAGES_DIR)) {
    fs.mkdirSync(LOCAL_IMAGES_DIR, { recursive: true });
  }
}

function saveLocalFile(buffer: Buffer, fileName: string): string {
  ensureLocalDir();
  const filePath = path.join(LOCAL_IMAGES_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return `/api/images/${fileName}`;
}

const router = Router();

// Serve locally-uploaded images
router.get("/images/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  if (filename !== req.params.filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
    res.status(400).json({ error: "Invalid filename" }); return;
  }
  const filePath = path.join(LOCAL_IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "Not found" }); return; }
  res.sendFile(filePath);
});

router.get("/storage/:bucket", async (req, res) => {
  const bucket = req.params.bucket;
  const objectPath = typeof req.query.path === "string" ? decodeURIComponent(req.query.path) : "";
  if (!["menu-images", "logos"].includes(bucket) ||
      !objectPath || objectPath.includes("..") || !/^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/.test(objectPath)) {
    res.status(400).json({ error: "Invalid storage path" }); return;
  }
  try {
    const response = await downloadStorageObject(bucket, objectPath);
    if (!response.ok) { res.status(response.status).end(); return; }
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.status(404).end();
  }
});

router.post("/upload", adminOnly, upload.single("image"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  try {
    const ext = detectedImageExtension(req.file.buffer);
    if (!ext || (ext === ".png" && req.file.mimetype !== "image/png") ||
        (ext === ".jpg" && req.file.mimetype !== "image/jpeg") ||
        (ext === ".webp" && req.file.mimetype !== "image/webp")) {
      res.status(415).json({ error: "Only valid JPEG, PNG, or WEBP image files are supported." });
      return;
    }
    const url = hasSupabase
      ? await uploadImageToSupabase(req.file.buffer, ext, "menu")
      : saveLocalFile(req.file.buffer, `menu-${nanoid(10)}${ext}`);
    res.json({ url });
  } catch {
    res.status(500).json({ error: "Upload failed" });
  }
});

router.post("/upload/logo", adminOnly, upload.single("image"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file" }); return; }
  try {
    const ext = detectedImageExtension(req.file.buffer);
    if (!ext || (ext === ".png" && req.file.mimetype !== "image/png") ||
        (ext === ".jpg" && req.file.mimetype !== "image/jpeg") ||
        (ext === ".webp" && req.file.mimetype !== "image/webp")) {
      res.status(415).json({ error: "Only valid JPEG, PNG, or WEBP image files are supported." });
      return;
    }
    const url = hasSupabase
      ? await uploadLogoToSupabase(req.file.buffer, ext)
      : saveLocalFile(req.file.buffer, `restaurant-logo-${nanoid(10)}${ext}`);
    await dbSetSetting("logo", url);
    store.settings.logo = url;
    res.json({ url });
  } catch {
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
