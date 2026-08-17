# DX Promo Kampanya Sayfası

Bu proje, kullanıcılara kazı kazan mantığı ile indirim kuponu veren statik bir promosyon (landing page) web projesidir.

## Özellikler
- **Statik HTML/CSS/JS:** Herhangi bir derleme (build) işlemine gerek duymadan çalışır.
- **Supabase Entegrasyonu:** Kullanıcıların doldurduğu form bilgileri (Ad, Soyad, İletişim) ve ardından verdikleri konum izinleri (Enlem, Boylam) Supabase veritabanına kaydedilir.
- **Mobil Uyumlu Tasarım:** Tüm ekran boyutlarında sorunsuz çalışır.
- **Animasyonlar & Kazı Kazan:** Canvas API kullanılarak interaktif bir kazı kazan deneyimi sunulur.

## Vercel Üzerinde Yayınlama (Deployment)

Proje standart bir statik web sitesi olduğundan Vercel üzerinde anında yayınlanabilir. Herhangi bir `package.json` veya derleme (build) komutuna ihtiyaç yoktur.

### Adım Adım Kurulum
1. Bu projeyi kendi **GitHub** hesabınıza bir repository olarak yükleyin (push).
2. [Vercel](https://vercel.com/) paneline giriş yapın.
3. **"Add New"** > **"Project"** seçeneğine tıklayın.
4. GitHub hesabınızı bağladıysanız, listeden projenizin repository'sini seçip **"Import"** butonuna basın.
5. "Framework Preset" kısmı otomatik olarak **"Other"** seçili gelecektir (böyle kalmalı).
6. **"Deploy"** butonuna basarak yayınlama işlemini tamamlayın. Birkaç saniye içinde siteniz canlıya alınacaktır.

## Güvenlik Notları
- Frontend üzerinde Supabase `anon` (public) anahtarı kullanılmaktadır. Bu güvenlik açığı oluşturmaz, ancak Supabase panelinizde `user_data` tablosu için **Row Level Security (RLS)** kurallarını (sadece INSERT ve UPDATE'e izin verecek şekilde) yapılandırdığınızdan emin olun.
