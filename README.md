# Football Competition

**Football Competition** adalah aplikasi Android sederhana untuk membuat dan mengelola kompetisi sepak bola custom. Aplikasi ini dibuat agar pengguna bisa membuat liga atau cup dengan tim sendiri, mengatur jadwal pertandingan, menginput skor, melihat klasemen, dan menyimpan riwayat kompetisi.

Aplikasi ini dibuat menggunakan konsep **WebView Android**, yaitu tampilan aplikasi berasal dari file HTML, CSS, dan JavaScript yang dijalankan di dalam aplikasi Android.

## Fitur Utama

* Membuat kompetisi **Liga**
* Membuat kompetisi **Cup / Knockout**
* Menambahkan tim custom
* Mengacak jadwal pertandingan
* Mengubah pertandingan secara manual
* Mengatur urutan pertandingan
* Input skor pertandingan
* Liga mendukung hasil seri
* Liga menggunakan sistem home vs away dan away vs home
* Cup menggunakan sistem gugur
* Riwayat kompetisi tersimpan
* Riwayat bisa dilihat kembali
* Riwayat bisa dihapus dengan konfirmasi
* Tampilan ringan dan cocok untuk HP Android lama

## Mode Kompetisi

### 1. Liga

Mode liga menggunakan sistem klasemen.

Aturan liga:

* Minimal 3 tim
* Setiap tim bertemu dua kali
* Ada pertandingan kandang dan tandang
* Menang mendapat 3 poin
* Seri mendapat 1 poin
* Kalah mendapat 0 poin
* Klasemen dihitung otomatis berdasarkan hasil pertandingan

Contoh:

```text
Tim 1 vs Tim 2
Tim 2 vs Tim 1
```

### 2. Cup / Knockout

Mode cup menggunakan sistem gugur.

Aturan cup:

* Minimal 3 tim
* Tim yang menang lanjut ke ronde berikutnya
* Tim yang kalah gugur
* Jika jumlah tim ganjil, salah satu tim mendapat bye
* Bracket dibuat agar pemenang ronde sebelumnya tetap lanjut secara konsisten

Contoh cup 5 tim:

```text
Ronde 1
Tim 2 vs Tim 3
Tim 5 vs Tim 4
Tim 1 bye

Ronde 2
Tim 4 vs Tim 1
Tim 2 bye

Final
Tim 1 vs Tim 2
```

## Tampilan Aplikasi

Aplikasi dibuat dengan tampilan sederhana dan ringan agar nyaman digunakan di HP.

Menu utama:

* Home
* Liga
* Cup
* Riwayat

Desain dibuat seperti aplikasi mobile, bukan website panjang, supaya lebih mudah digunakan dan tidak terlalu berat saat scroll.

## Teknologi yang Digunakan

* HTML
* CSS
* JavaScript
* Android Studio
* Java
* Android WebView
* LocalStorage

## Penyimpanan Data

Data kompetisi disimpan menggunakan **localStorage** di dalam WebView. Jadi riwayat liga dan cup tetap tersimpan selama data aplikasi tidak dihapus.

Data yang tersimpan:

* Daftar kompetisi
* Daftar tim
* Jadwal pertandingan
* Hasil pertandingan
* Klasemen liga
* Bracket cup
* Riwayat kompetisi

## Download Aplikasi

APK aplikasi dapat diunduh melalui link berikut:

**Download APK:**
[Download Football Competition](https://github.com/AlanMulik33/footballCompetition-Android/releases/tag/v1.0)

> Catatan: Jika Android menampilkan peringatan saat instalasi, aktifkan izin instalasi dari sumber tidak dikenal pada perangkat.

## Cara Install APK

1. Download file APK dari link di atas.
2. Buka file APK di HP Android.
3. Jika muncul peringatan keamanan, pilih izinkan instalasi dari sumber tersebut.
4. Klik Install.
5. Setelah selesai, buka aplikasi **Football Competition**.

## Struktur Project

```text
Football Competition
├── app
│   └── src
│       └── main
│           ├── assets
│           │   ├── index.html
│           │   ├── style.css
│           │   └── script.js
│           ├── java
│           │   └── com.alzen.footballcompetition
│           │       └── MainActivity.java
│           ├── res
│           └── AndroidManifest.xml
```

## Status Project

Project ini dibuat sebagai aplikasi sederhana untuk mengelola kompetisi sepak bola custom. Fitur utama sudah berjalan, termasuk liga, cup, input skor, klasemen, bracket, riwayat, dan hapus riwayat.

## Developer

Dibuat oleh:

**Alan Zebulon Mulik**
