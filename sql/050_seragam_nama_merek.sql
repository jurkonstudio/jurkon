-- 050: seragamkan nama merek menjadi "Jurkon" (sesuai domain jurkon.my.id).
-- "Jurnal Koneksi" hanya dipakai sebagai kepanjangan. Aman diulang.
-- Hanya menimpa bila nilainya masih nama lama, jadi isi kustom dari panel admin tidak tertimpa.
update pengaturan_situs
   set nilai = 'Jurkon'
 where kunci = 'brand_nama'
   and nilai in ('Jurnal Koneksi', 'Journal Connection', '');
-- Catatan: jalankan ulang 042_sambutan.sql agar tanda tangan pesan sambutan ikut "Tim Jurkon".
