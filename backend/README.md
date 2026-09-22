# KRISNApedia API

Backend API tahap pertama untuk PostgreSQL lokal. React/TanStack dan `/studio` tetap berada di root repository.

## Menjalankan lokal

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```

Isi `.env` dengan kredensial PostgreSQL lokal, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD` sebelum menjalankan seed.

Endpoint tersedia di `/api/v1`: `POST auth/login`, CRUD `insights`, `manuals`, `regulations`, dan `faqs`. Endpoint baca publik hanya mengembalikan konten `published=true`; CRUD memerlukan `Authorization: Bearer <token>`.
