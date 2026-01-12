#!/usr/bin/env zx

/**
 * ============================================================================
 * TRAEFIK LABEL GENERATOR
 * ============================================================================
 * Script untuk menghasilkan label Traefik yang siap digunakan dalam
 * docker-compose.yml. Script ini membantu membuat konfigurasi routing,
 * middleware, dan service discovery untuk Traefik reverse proxy.
 * 
 * @author bangHasan
 * @email banghasan@gmail.com
 * @github https://github.com/banghasan
 * @version 2.0.0
 * @requires zx
 * ============================================================================
 */

// ============================================================================
// KONFIGURASI & KONSTANTA
// ============================================================================

/**
 * Konfigurasi default untuk berbagai parameter Traefik
 */
const CONFIG = {
  DEFAULT_ENTRYPOINT: "web",
  DEFAULT_PORT: "80",
  DEFAULT_NETWORK: "hasanNet",
  
  // Daftar middleware yang umum digunakan
  COMMON_MIDDLEWARES: [
    "logger",
    "cloudflarewarp",
    "auth-user",
    "common-ratelimit",
    "strip-all-prefix",
    "error-pages",
    "gzip-compress",
  ],
  
  // Regex untuk validasi
  VALIDATION: {
    // Namespace hanya boleh huruf, angka, dash, dan underscore
    NAMESPACE: /^[a-zA-Z0-9_-]+$/,
    // Port harus angka 1-65535
    PORT: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/,
    // Host harus format domain yang valid
    HOST: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  },
};

// ============================================================================
// FUNGSI HELPER - VALIDASI INPUT
// ============================================================================

/**
 * Memvalidasi namespace sesuai dengan aturan Traefik
 * Namespace hanya boleh mengandung huruf, angka, dash (-), dan underscore (_)
 * 
 * @param {string} namespace - Namespace yang akan divalidasi
 * @returns {boolean} True jika valid, false jika tidak
 */
function isValidNamespace(namespace) {
  return CONFIG.VALIDATION.NAMESPACE.test(namespace);
}

/**
 * Memvalidasi format host/domain
 * 
 * @param {string} host - Host yang akan divalidasi
 * @returns {boolean} True jika valid, false jika tidak
 */
function isValidHost(host) {
  return CONFIG.VALIDATION.HOST.test(host);
}

/**
 * Memvalidasi nomor port
 * Port harus berupa angka antara 1-65535
 * 
 * @param {string} port - Port yang akan divalidasi
 * @returns {boolean} True jika valid, false jika tidak
 */
function isValidPort(port) {
  return CONFIG.VALIDATION.PORT.test(port);
}

// ============================================================================
// FUNGSI HELPER - INPUT USER
// ============================================================================

/**
 * Meminta input namespace dari user dengan validasi
 * Akan terus meminta input sampai user memberikan namespace yang valid
 * 
 * @returns {Promise<string>} Namespace yang valid
 */
async function promptNamespace() {
  let namespace = "";
  
  while (true) {
    namespace = await question(
      chalk.cyan("1. Masukkan Namespace") + 
      chalk.gray(" (contoh: adminer, api-gateway)") + 
      ": "
    );
    
    // Cek apakah kosong
    if (!namespace) {
      console.log(chalk.red("   ❌ Namespace tidak boleh kosong!"));
      continue;
    }
    
    // Cek apakah format valid
    if (!isValidNamespace(namespace)) {
      console.log(chalk.red("   ❌ Namespace hanya boleh mengandung huruf, angka, dash (-), dan underscore (_)"));
      continue;
    }
    
    // Jika lolos semua validasi, keluar dari loop
    console.log(chalk.green("   ✓ Namespace valid"));
    break;
  }
  
  return namespace;
}

/**
 * Meminta input host dan path dari user
 * User bisa menambahkan multiple host/path rules
 * 
 * @returns {Promise<string>} Rule lengkap dalam format Traefik
 */
async function promptHostAndPath() {
  const rules = [];
  let addMore = "y";
  
  console.log(chalk.cyan("\n2. Konfigurasi Host dan Path"));
  console.log(chalk.gray("   Anda bisa menambahkan multiple host/path rules\n"));
  
  while (addMore.toLowerCase() === "y") {
    // Input host
    let host = "";
    while (true) {
      host = await question(
        chalk.cyan("   Host") + 
        chalk.gray(" (contoh: api.domain.com)") + 
        ": "
      );
      
      if (!host) {
        console.log(chalk.red("   ❌ Host tidak boleh kosong!"));
        continue;
      }
      
      if (!isValidHost(host)) {
        console.log(chalk.red("   ❌ Format host tidak valid!"));
        continue;
      }
      
      console.log(chalk.green("   ✓ Host valid"));
      break;
    }
    
    // Input prefix path (opsional)
    const prefix = await question(
      chalk.cyan("   Prefix Path") + 
      chalk.gray(" (opsional, contoh: /api/v1)") + 
      ": "
    );
    
    // Buat rule berdasarkan input
    let rule = `Host(\`${host}\`)`;
    if (prefix) {
      rule += ` && PathPrefix(\`${prefix}\`)`;
      console.log(chalk.green(`   ✓ Rule: ${rule}`));
    } else {
      console.log(chalk.green(`   ✓ Rule: ${rule}`));
    }
    
    rules.push(rule);
    
    // Tanya apakah mau tambah lagi
    addMore = await question(chalk.cyan("\n   Tambah host/path lain?") + " (y/N): ");
    addMore = addMore || "n";
  }
  
  // Gabungkan semua rules dengan operator OR
  return rules.join(" || ");
}

/**
 * Meminta input entrypoints dari user
 * 
 * @returns {Promise<string>} Nama entrypoint
 */
async function promptEntrypoints() {
  console.log(chalk.cyan("\n3. Entrypoints"));
  console.log(chalk.gray("   Entrypoint adalah port listener di Traefik (contoh: web, websecure)"));
  
  let entrypoints = await question(
    chalk.cyan("   Entrypoints") + 
    chalk.gray(` (default: ${CONFIG.DEFAULT_ENTRYPOINT})`) + 
    ": "
  );
  
  entrypoints = entrypoints || CONFIG.DEFAULT_ENTRYPOINT;
  console.log(chalk.green(`   ✓ Menggunakan entrypoint: ${entrypoints}`));
  
  return entrypoints;
}

/**
 * Meminta input port dari user dengan validasi
 * 
 * @returns {Promise<string>} Nomor port yang valid
 */
async function promptPort() {
  console.log(chalk.cyan("\n4. Port Container"));
  console.log(chalk.gray("   Port internal container yang akan di-forward oleh Traefik"));
  
  let port = "";
  
  while (true) {
    port = await question(
      chalk.cyan("   Port") + 
      chalk.gray(` (default: ${CONFIG.DEFAULT_PORT})`) + 
      ": "
    );
    
    port = port || CONFIG.DEFAULT_PORT;
    
    if (!isValidPort(port)) {
      console.log(chalk.red("   ❌ Port harus berupa angka antara 1-65535"));
      continue;
    }
    
    console.log(chalk.green(`   ✓ Port valid: ${port}`));
    break;
  }
  
  return port;
}

/**
 * Meminta input middlewares dari user
 * User bisa memilih dari daftar middleware umum atau menambahkan custom
 * 
 * @returns {Promise<string>} Daftar middleware yang dipisahkan koma
 */
async function promptMiddlewares() {
  const mwArray = [];
  
  console.log(chalk.cyan("\n5. Middlewares"));
  console.log(chalk.gray("   Middleware adalah komponen yang memproses request sebelum sampai ke service"));
  
  const useMw = await question(chalk.cyan("   Gunakan middlewares?") + " (y/N): ");
  
  if (useMw.toLowerCase() === "y") {
    console.log(chalk.gray("\n   Pilih dari middleware yang umum digunakan:"));
    
    // Tampilkan daftar middleware umum
    for (const mw of CONFIG.COMMON_MIDDLEWARES) {
      const chosen = await question(
        `   ${chalk.gray("•")} ${chalk.yellow(mw)}? (y/N): `
      );
      
      if (chosen.toLowerCase() === "y") {
        mwArray.push(mw);
        console.log(chalk.green(`     ✓ ${mw} ditambahkan`));
      }
    }
    
    // Opsi untuk menambahkan custom middleware
    console.log(chalk.gray("\n   Tambahkan middleware kustom (jika ada):"));
    while (true) {
      const custom = await question(
        chalk.cyan("   Nama middleware kustom") + 
        chalk.gray(" (kosongkan jika selesai)") + 
        ": "
      );
      
      if (!custom) break;
      
      mwArray.push(custom);
      console.log(chalk.green(`   ✓ ${custom} ditambahkan`));
    }
  }
  
  if (mwArray.length > 0) {
    console.log(chalk.green(`\n   ✓ Total ${mwArray.length} middleware dipilih`));
  }
  
  return mwArray.join(",");
}

/**
 * Meminta input service name dari user (opsional)
 * Jika tidak diisi, Traefik akan menggunakan implicit service discovery
 * 
 * @returns {Promise<string>} Nama service atau string kosong
 */
async function promptServiceName() {
  console.log(chalk.cyan("\n6. Service Name"));
  console.log(chalk.yellow("   ℹ️  Jika dikosongkan, Traefik akan menggunakan 'Implicit Service Discovery'"));
  console.log(chalk.gray("   (router otomatis terhubung ke internal container service ini)"));
  
  const serviceName = await question(
    chalk.cyan("   Nama Service") + 
    chalk.gray(" (opsional)") + 
    ": "
  );
  
  if (serviceName) {
    console.log(chalk.green(`   ✓ Menggunakan service: ${serviceName}`));
  } else {
    console.log(chalk.green("   ✓ Menggunakan implicit service discovery"));
  }
  
  return serviceName;
}

/**
 * Meminta input network dari user
 * 
 * @returns {Promise<string>} Nama network Docker
 */
async function promptNetwork() {
  console.log(chalk.cyan("\n7. Docker Network"));
  console.log(chalk.gray("   Network Docker yang digunakan untuk komunikasi antar container"));
  
  let network = await question(
    chalk.cyan("   Network") + 
    chalk.gray(` (default: ${CONFIG.DEFAULT_NETWORK})`) + 
    ": "
  );
  
  network = network || CONFIG.DEFAULT_NETWORK;
  console.log(chalk.green(`   ✓ Menggunakan network: ${network}`));
  
  return network;
}

// ============================================================================
// FUNGSI HELPER - GENERATE OUTPUT
// ============================================================================

/**
 * Menghasilkan array berisi label-label Traefik
 * 
 * @param {Object} config - Objek konfigurasi
 * @param {string} config.namespace - Namespace untuk router dan service
 * @param {string} config.network - Docker network
 * @param {string} config.rule - Rule untuk routing (Host, PathPrefix, dll)
 * @param {string} config.port - Port container
 * @param {string} config.entrypoints - Entrypoint Traefik
 * @param {string} config.serviceName - Nama service (opsional)
 * @param {string} config.middlewares - Daftar middleware (opsional)
 * @returns {string[]} Array berisi label-label Traefik
 */
function generateTraefikLabels(config) {
  const { namespace, network, rule, port, entrypoints, serviceName, middlewares } = config;
  
  // Label dasar yang selalu ada
  const labels = [
    `    labels:`,
    `      - "traefik.enable=true"`,
    `      - "traefik.docker.network=${network}"`,
    `      - "traefik.http.routers.${namespace}.rule=${rule}"`,
    `      - "traefik.http.services.${namespace}.loadbalancer.server.port=${port}"`,
    `      - "traefik.http.routers.${namespace}.entrypoints=${entrypoints}"`,
  ];
  
  // Tambahkan service name jika ada
  if (serviceName) {
    labels.push(
      `      - "traefik.http.routers.${namespace}.service=${serviceName}"`
    );
  }
  
  // Tambahkan middlewares jika ada
  if (middlewares) {
    labels.push(
      `      - "traefik.http.routers.${namespace}.middlewares=${middlewares}"`
    );
  }
  
  return labels;
}

/**
 * Menampilkan preview konfigurasi sebelum output final
 * 
 * @param {Object} config - Objek konfigurasi
 */
function displayPreview(config) {
  console.log(chalk.blue.bold("\n" + "=".repeat(60)));
  console.log(chalk.blue.bold("PREVIEW KONFIGURASI"));
  console.log(chalk.blue.bold("=".repeat(60)));
  
  console.log(chalk.cyan("\n📦 Namespace:       ") + chalk.white(config.namespace));
  console.log(chalk.cyan("🌐 Network:         ") + chalk.white(config.network));
  console.log(chalk.cyan("🚪 Entrypoints:     ") + chalk.white(config.entrypoints));
  console.log(chalk.cyan("🔌 Port:            ") + chalk.white(config.port));
  console.log(chalk.cyan("📍 Rule:            ") + chalk.white(config.rule));
  
  if (config.serviceName) {
    console.log(chalk.cyan("⚙️  Service:         ") + chalk.white(config.serviceName));
  }
  
  if (config.middlewares) {
    console.log(chalk.cyan("🔧 Middlewares:     ") + chalk.white(config.middlewares));
  }
  
  console.log(chalk.blue.bold("\n" + "=".repeat(60)));
}

/**
 * Menyimpan output ke file
 * 
 * @param {string[]} labels - Array berisi label-label Traefik
 * @param {string} filename - Nama file untuk menyimpan output
 */
async function saveToFile(labels, filename) {
  try {
    const content = labels.join("\n");
    await fs.writeFile(filename, content, "utf-8");
    console.log(chalk.green(`\n✓ Output berhasil disimpan ke: ${filename}`));
  } catch (error) {
    console.log(chalk.red(`\n❌ Gagal menyimpan file: ${error.message}`));
  }
}

// ============================================================================
// FUNGSI UTAMA
// ============================================================================

/**
 * Fungsi utama yang menjalankan seluruh flow aplikasi
 */
async function main() {
  try {
    // Header aplikasi
    console.log(chalk.blue.bold("\n" + "=".repeat(60)));
    console.log(chalk.blue.bold("🚀 TRAEFIK LABEL GENERATOR"));
    console.log(chalk.blue.bold("=".repeat(60)));
    console.log(chalk.gray("Generator untuk membuat label Traefik di docker-compose.yml\n"));
    
    // Kumpulkan semua input dari user
    const namespace = await promptNamespace();
    const rule = await promptHostAndPath();
    const entrypoints = await promptEntrypoints();
    const port = await promptPort();
    const middlewares = await promptMiddlewares();
    const serviceName = await promptServiceName();
    const network = await promptNetwork();
    
    // Buat objek konfigurasi
    const config = {
      namespace,
      network,
      rule,
      port,
      entrypoints,
      serviceName,
      middlewares,
    };
    
    // Tampilkan preview
    displayPreview(config);
    
    // Generate labels
    const labels = generateTraefikLabels(config);
    
    // Tampilkan hasil
    console.log(chalk.green.bold("\n" + "=".repeat(60)));
    console.log(chalk.green.bold("✨ HASIL LABEL TRAEFIK"));
    console.log(chalk.green.bold("=".repeat(60) + "\n"));
    
    labels.forEach((line) => console.log(chalk.white(line)));
    
    console.log(chalk.green.bold("\n" + "=".repeat(60)));
    
    // Tanya apakah mau save ke file
    const saveFile = await question(
      chalk.cyan("\n💾 Simpan output ke file?") + " (y/N): "
    );
    
    if (saveFile.toLowerCase() === "y") {
      const filename = await question(
        chalk.cyan("   Nama file") + 
        chalk.gray(" (default: traefik-labels.yml)") + 
        ": "
      );
      
      const finalFilename = filename || "traefik-labels.yml";
      await saveToFile(labels, finalFilename);
    }
    
    console.log(chalk.blue.bold("\n✓ Selesai! Terima kasih telah menggunakan Traefik Label Generator\n"));
    
  } catch (error) {
    // Error handling
    console.log(chalk.red.bold("\n❌ ERROR: Terjadi kesalahan!"));
    console.log(chalk.red(`   ${error.message}`));
    console.log(chalk.gray("\n   Stack trace:"));
    console.log(chalk.gray(error.stack));
    process.exit(1);
  }
}

// ============================================================================
// JALANKAN APLIKASI
// ============================================================================

// Jalankan fungsi main
main();
