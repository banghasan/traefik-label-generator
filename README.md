# Traefik Label Generator

Aplikasi berbasis CLI (Command Line Interface) yang dibuat dengan `zx` untuk
membantu men-generate label Traefik untuk `docker-compose.yml`.

Tools ini memudahkan proses pembuatan konfigurasi routing, middleware, dan
service discovery untuk Traefik reverse proxy tanpa harus mengetik konfigurasi
manual yang rentan typo.

## Fitur

- ✨ **Interactive Wizard**: Panduan step-by-step yang mudah diikuti.
- 🛡️ **Validasi Input**: Memastikan namespace, port, dan host valid sebelum
  diproses.
- 🔧 **Middleware Selector**: Memilih middleware umum (logger, auth,
  compression, dll) dengan mudah.
- 📝 **Preview & Export**: Melihat preview konfigurasi sebelum menyimpan ke
  file.
- 🚀 **Standard Best Practice**: Menggunakan konfigurasi standar yang aman dan
  optimal.

## Prasyarat

- Node.js (versi terbaru direkomendasikan)
- `zx` (Google's safer bash script writer)

```bash
npm i -g zx
```

## Cara Penggunaan

1. Pastikan script memiliki izin eksekusi:
   ```bash
   chmod +x traefik.mjs
   ```

2. Jalankan script:
   ```bash
   ./traefik.mjs
   ```

3. Ikuti petunjuk di layar untuk memasukkan:
   - **Namespace**: Nama unik untuk router/service (misal: `my-app`).
   - **Host & Path**: Domain dan path prefix (misal: `app.example.com`).
   - **Entrypoints**: Port listener Traefik (default: `web`).
   - **Port**: Port internal container aplikasi.
   - **Middlewares**: Pilih middleware yang dibutuhkan.
   - **Service Name**: (Opsional) Nama service eksplisit.
   - **Network**: Network docker yang digunakan (default: `hasanNet`).

## Contoh Penggunaan

Berikut adalah tangkapan layar proses penggunaan aplikasi:

```text
============================================================
🚀 TRAEFIK LABEL GENERATOR
============================================================
Generator untuk membuat label Traefik di docker-compose.yml

1. Masukkan Namespace (contoh: adminer, api-gateway): my-app
   ✓ Namespace valid

2. Konfigurasi Host dan Path
   Anda bisa menambahkan multiple host/path rules

   Host (contoh: api.domain.com): app.local
   ✓ Host valid
   Prefix Path (opsional, contoh: /api/v1): 
   ✓ Rule: Host(`app.local`)

   Tambah host/path lain? (y/N): n

3. Entrypoints
   Entrypoint adalah port listener di Traefik (contoh: web, websecure)
   Entrypoints (default: web): 
   ✓ Menggunakan entrypoint: web

4. Port Container
   Port internal container yang akan di-forward oleh Traefik
   Port (default: 80): 3000
   ✓ Port valid: 3000

5. Middlewares
   Middleware adalah komponen yang memproses request sebelum sampai ke service
   Gunakan middlewares? (y/N): y

   Pilih dari middleware yang umum digunakan:
   • logger? (y/N): y
     ✓ logger ditambahkan
   • cloudflarewarp? (y/N): n
   • auth-user? (y/N): n
   • common-ratelimit? (y/N): y
     ✓ common-ratelimit ditambahkan
   • gzip-compress? (y/N): y
     ✓ gzip-compress ditambahkan
   • strip-all-prefix? (y/N): n

   Tambahkan middleware kustom (jika ada):
   Nama middleware kustom (kosongkan jika selesai): 

   ✓ Total 3 middleware dipilih

6. Service Name
   ℹ️  Jika dikosongkan, Traefik akan menggunakan 'Implicit Service Discovery'
   (router otomatis terhubung ke internal container service ini)
   Nama Service (opsional): 
   ✓ Menggunakan implicit service discovery

7. Docker Network
   Network Docker yang digunakan untuk komunikasi antar container
   Network (default: hasanNet): 
   ✓ Menggunakan network: hasanNet

============================================================
PREVIEW KONFIGURASI
============================================================

📦 Namespace:       my-app
🌐 Network:         hasanNet
🚪 Entrypoints:     web
🔌 Port:            3000
📍 Rule:            Host(`app.local`)
🔧 Middlewares:     logger,common-ratelimit,gzip-compress

============================================================

============================================================
✨ HASIL LABEL TRAEFIK
============================================================

    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=hasanNet"
      - "traefik.http.routers.my-app.rule=Host(`app.local`)"
      - "traefik.http.services.my-app.loadbalancer.server.port=3000"
      - "traefik.http.routers.my-app.entrypoints=web"
      - "traefik.http.routers.my-app.middlewares=logger,common-ratelimit,gzip-compress"

============================================================

💾 Simpan output ke file? (y/N): y
   Nama file (default: traefik-labels.yml): 

✓ Output berhasil disimpan ke: traefik-labels.yml

✓ Selesai! Terima kasih telah menggunakan Traefik Label Generator
```

## Tips

- Gunakan nama **Namespace** yang deskriptif agar mudah dikenali di dashboard
  Traefik.
- Pastikan **Network** yang dipilih sama dengan network yang digunakan container
  Traefik.
- Jika menggunakan **Prefix Path** dan aplikasi tidak mendukung base path,
  gunakan middleware `strip-all-prefix`.
